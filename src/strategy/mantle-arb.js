/**
 * Mantle Arb Strategy - MantleArb
 * Mantle 链专属套利策略 + 低 gas 优化
 *
 * 利用 Mantle Network 的低 gas 费和高 TPS 特性
 * 实现高频、低成本的跨 DEX 套利策略
 */

const { ethers } = require('ethers');

const STRATEGY_CONFIG = {
  minProfitBps: 50,          // 最低利润 0.5%
  maxSlippageBps: 100,       // 最大滑点 1%
  maxTradeSizeUsd: 10000,    // 单笔最大交易额
  maxDailyTrades: 200,       // Mantle 低 gas 支持更高频交易
  gasBoostPercent: 10,       // gas 加速百分比
  mantelGasPrice: '0.02',    // Mantle 极低 gas price (Gwei)
  cooldownMs: 2000,          // 同一对交易冷却时间
};

class MantleArbStrategy {
  constructor(monitor, executor, config = {}) {
    this.monitor = monitor;
    this.executor = executor;
    this.config = { ...STRATEGY_CONFIG, ...config };
    this.tradeCount = 0;
    this.dailyPnl = 0;
    this.lastTradeTime = new Map();
    this.tradeHistory = [];
    this.lastResetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * 主策略循环 — 扫描套利机会并执行
   */
  async executeStrategy(tokenPairs) {
    // ✅ Reset daily trade counter at midnight
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.tradeCount = 0;
      this.dailyPnl = 0;
      this.lastResetDate = today;
    }

    if (this.tradeCount >= this.config.maxDailyTrades) {
      return { action: 'skip', reason: 'daily_limit_reached' };
    }

    const opportunities = await this.monitor.scanArbitrageOpportunities(tokenPairs);
    const viable = opportunities.filter(opp => this._isViable(opp));

    if (viable.length === 0) {
      return { action: 'skip', reason: 'no_viable_opportunities' };
    }

    const best = viable[0];
    const tradeKey = best.pair + '_' + best.buyFrom + '_' + best.sellTo;

    if (this._isOnCooldown(tradeKey)) {
      return { action: 'skip', reason: 'cooldown', pair: best.pair };
    }

    const tradeParams = this._buildTradeParams(best);
    const result = await this._executeArbitrage(tradeParams);

    this.lastTradeTime.set(tradeKey, Date.now());
    this.tradeCount++;
    this.tradeHistory.push({ ...result, opportunity: best, timestamp: Date.now() });

    return result;
  }

  /**
   * 评估套利可行性
   */
  _isViable(opportunity) {
    if (opportunity.spreadPercent < this.config.minProfitBps / 100) return false;

    const estimatedGas = this._estimateGasCost();
    const grossProfit = opportunity.spreadPercent / 100 * this.config.maxTradeSizeUsd;
    const netProfit = grossProfit - estimatedGas;

    return netProfit > 0;
  }

  /**
   * 构建交易参数 — Mantle 低 gas 优化
   */
  _buildTradeParams(opportunity) {
    const tradeSize = Math.min(
      this.config.maxTradeSizeUsd,
      this._calculateOptimalSize(opportunity)
    );

    const [tokenA, tokenB] = opportunity.pair.split('/');
    const minProfit = tradeSize * (opportunity.spreadPercent / 100) * (1 - this.config.maxSlippageBps / 10000);

    // ✅ Use precise integer arithmetic instead of float truncation
    // Convert USD amounts to wei (18 decimals) using BigInt to avoid precision loss
    const amountInWei = BigInt(Math.round(tradeSize * 1e6)) * 1000000000000n; // 1e6 -> 1e18
    const minProfitWei = BigInt(Math.round(minProfit * 1e6)) * 1000000000000n;

    return {
      tokenA,
      tokenB,
      amountIn: amountInWei,
      buyRouter: this._getRouter(opportunity.buyFrom),
      sellRouter: this._getRouter(opportunity.sellTo),
      minProfitOut: minProfitWei,
      deadline: Math.floor(Date.now() / 1000) + 300,
      gasLimit: this.config.mantelGasPrice ? 300000 : 500000,
      gasPrice: ethers.utils.parseUnits(this.config.mantelGasPrice, 'gwei'),
      slippageBps: this.config.maxSlippageBps,
    };
  }

  /**
   * 执行套利交易
   */
  async _executeArbitrage(params) {
    try {
      const tx = await this.executor.executeFlashLoan({
        token: params.tokenA,
        amount: params.amountIn,
        steps: [
          { router: params.buyRouter, tokenIn: params.tokenA, tokenOut: params.tokenB },
          { router: params.sellRouter, tokenIn: params.tokenB, tokenOut: params.tokenA },
        ],
        minProfit: params.minProfitOut,
        gasLimit: params.gasLimit,
        gasPrice: params.gasPrice,
      });

      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: gasCost.toString(),
        gasCostUsd: parseFloat(ethers.utils.formatEther(gasCost)) * 2500,
        blockNumber: receipt.blockNumber,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 计算最优交易规模
   */
  _calculateOptimalSize(opportunity) {
    const baseSize = this.config.maxTradeSizeUsd;
    const spreadFactor = opportunity.spreadPercent / (this.config.minProfitBps / 100);
    return Math.min(baseSize, baseSize * Math.min(spreadFactor, 2));
  }

  _estimateGasCost() {
    const gasPrice = parseFloat(this.config.mantelGasPrice);
    const gasLimit = 300000;
    const gasCostEth = (gasPrice * gasLimit) / 1e9;
    return gasCostEth * 2500;
  }

  _isOnCooldown(tradeKey) {
    const lastTime = this.lastTradeTime.get(tradeKey);
    return lastTime && Date.now() - lastTime < this.config.cooldownMs;
  }

  _getRouter(dexName) {
    const routers = {
      'Merchant Moe': '0x2E3C6e492e1C11bC4fDa3B68e94b231eF0Dc5b2c',
      'Agni Finance': '0x315eC99127Bb8D8F0e7B3a328c4A6F0a5f7A2e6e',
      'FusionX': '0x5C6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    };
    return routers[dexName] || ethers.constants.AddressZero;
  }

  getStats() {
    const successful = this.tradeHistory.filter(t => t.success);
    return {
      totalTrades: this.tradeCount,
      successfulTrades: successful.length,
      failedTrades: this.tradeCount - successful.length,
      totalGasCost: successful.reduce((s, t) => s + (t.gasCostUsd || 0), 0),
      dailyPnl: this.dailyPnl,
    };
  }
}

module.exports = { MantleArbStrategy, STRATEGY_CONFIG };

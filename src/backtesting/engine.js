/**
 * Backtesting Engine - 统一使用美元float作为所有金额单位
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class BacktestEngine {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('backtesting:engine');
    this.trades = [];
    this.equity = [];
    // ✅ 统一使用美元float
    this.initialCapital = config?.initialCapital || 10000;       // $10,000 USD
    this.gasCostPerTrade = config?.gasCostPerTrade || 0.01;      // $0.01 USD (Mantle L2实际成本)
    this.ethPrice = config?.ethPrice || 3500;                    // ETH参考价格
  }

  /**
   * Run backtest with given strategy over historical data
   * @param {Object} strategy - Strategy instance with scan() method
   * @param {Object[]} dataPoints - Historical market data
   * @returns {Object} - Backtest results
   */
  async run(strategy, dataPoints) {
    this.logger.info(`Starting backtest: ${dataPoints.length} data points`);
    let capital = this.initialCapital;  // float USD
    this.trades = [];
    this.equity = [{ timestamp: dataPoints[0]?.timestamp || 0, value: capital }];

    for (let i = 0; i < dataPoints.length; i++) {
      const dp = dataPoints[i];
      const window = dataPoints.slice(Math.max(0, i - 50), i + 1);
      const marketData = this._buildMarketData(window);

      try {
        const opportunities = await strategy.scan(marketData);
        for (const opp of opportunities) {
          const tradeResult = this._simulateTrade(opp, capital);
          if (tradeResult.executed) {
            capital += tradeResult.pnl;
            this.trades.push({
              timestamp: dp.timestamp,
              ...tradeResult,
              capitalAfter: capital,
            });
          }
        }
      } catch (e) {
        // Strategy errors are non-fatal in backtesting
      }

      this.equity.push({ timestamp: dp.timestamp, value: capital });
    }

    return this._computeResults(capital);
  }

  _buildMarketData(dataWindow) {
    const last = dataWindow[dataWindow.length - 1];
    return {
      price: last.close,
      volume: last.volume,
      timestamp: last.timestamp,
      history: dataWindow.map(d => d.close),
      pairs: this._extractPairs(dataWindow),
    };
  }

  _extractPairs(dataWindow) {
    return dataWindow.map(d => ({
      tokenA: 'WETH',
      tokenB: 'USDC',
      reserveA: Math.floor(d.volume),           // ✅ float
      reserveB: Math.floor(d.close * d.volume), // ✅ float
      feeBps: 0.3,                               // ✅ float (0.3%)
    }));
  }

  _simulateTrade(opportunity, capital) {
    const profitBps = opportunity.profitBps || opportunity.netProfitBps || 0;
    if (profitBps <= 0) return { executed: false };

    const tradeSize = capital / 10; // 10% of capital per trade
    const grossProfit = (tradeSize * profitBps) / 10000;
    const gasCost = this.gasCostPerTrade;        // ✅ float USD
    const netProfit = grossProfit - gasCost;

    if (netProfit <= 0) return { executed: false };

    return {
      executed: true,
      strategy: opportunity.strategy,
      tradeSize,      // ✅ float USD
      grossProfit,    // ✅ float USD
      gasCost,        // ✅ float USD
      pnl: netProfit, // ✅ float USD
      profitBps,      // float
    };
  }

  _computeResults(finalCapital) {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.pnl > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const totalPnl = finalCapital - this.initialCapital;
    const totalReturnPct = ((finalCapital / this.initialCapital) - 1) * 100;

    // Max drawdown
    let peak = this.initialCapital;
    let maxDrawdown = 0;
    for (const eq of this.equity) {
      if (eq.value > peak) peak = eq.value;
      const dd = peak - eq.value;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      initialCapital: this.initialCapital,   // ✅ float USD
      finalCapital,                           // ✅ float USD
      totalPnl,                               // ✅ float USD
      totalReturnPercent: totalReturnPct,    // ✅ float %
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      maxDrawdown,                            // ✅ float USD
      maxDrawdownPercent: this.initialCapital > 0
        ? (maxDrawdown / this.initialCapital) * 100
        : 0,
      trades: this.trades,
      equityCurve: this.equity,
    };
  }

  /**
   * 与链上交互时的单位转换工具
   */
  static usdToWei(usdAmount, ethPrice) {
    return BigInt(Math.round(usdAmount / ethPrice * 1e18));
  }

  static weiToUsd(weiAmount, ethPrice) {
    return Number(weiAmount) / 1e18 * ethPrice;
  }
}

module.exports = { BacktestEngine };

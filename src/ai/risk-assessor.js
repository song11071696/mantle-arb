/**
 * Risk Assessor - Evaluates risk for arbitrage trades
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class RiskAssessor {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('ai:risk');
    this.maxPositionPercent = config?.trading?.maxPositionPercent || 10;
    this.maxDailyLossBps = config?.trading?.maxDailyLossBps || 500; // 5%
    this.dailyPnl = 0n;
    this.dailyTradeCount = 0;
    this.lastReset = Date.now();
  }

  /**
   * Assess risk for a proposed trade
   * @param {Object} trade - { pair, size, strategy, profitBps, gasCost }
   * @param {Object} portfolio - { totalCapital, openPositions }
   * @returns {Object} - { approved, riskScore, reasons }
   */
  assess(trade, portfolio) {
    this._resetDailyIfNewDay();

    const checks = [
      this._checkPositionSize(trade, portfolio),
      this._checkDailyLoss(trade, portfolio),
      this._checkSlippageRisk(trade),
      this._checkLiquidityRisk(trade),
      this._checkGasViability(trade),
      this._checkConcentrationRisk(trade, portfolio),
    ];

    const riskScore = checks.reduce((s, c) => s + c.score, 0) / checks.length;
    const approved = checks.every(c => c.pass);
    const reasons = checks.filter(c => !c.pass).map(c => c.reason);

    return { approved, riskScore, reasons, checks };
  }

  _checkPositionSize(trade, portfolio) {
    const maxPos = (portfolio.totalCapital * BigInt(this.maxPositionPercent)) / 100n;
    const pass = trade.size <= maxPos;
    return {
      name: 'position_size',
      pass,
      score: pass ? 0.1 : 0.9,
      reason: pass ? null : `Position size ${trade.size} exceeds max ${maxPos}`,
    };
  }

  _checkDailyLoss(trade, portfolio) {
    const maxLoss = (portfolio.totalCapital * BigInt(this.maxDailyLossBps)) / 10000n;
    const pass = this.dailyPnl >= -maxLoss;
    return {
      name: 'daily_loss',
      pass,
      score: pass ? 0.1 : 1.0,
      reason: pass ? null : `Daily loss limit reached: ${this.dailyPnl}`,
    };
  }

  _checkSlippageRisk(trade) {
    const estimatedSlippage = trade.estimatedSlippageBps || 0n;
    const maxSlippage = BigInt(this.config?.trading?.maxSlippageBps || 100);
    const pass = estimatedSlippage <= maxSlippage;
    return {
      name: 'slippage',
      pass,
      score: Number(estimatedSlippage) / Number(maxSlippage),
      reason: pass ? null : `Slippage ${estimatedSlippage} bps exceeds max ${maxSlippage} bps`,
    };
  }

  _checkLiquidityRisk(trade) {
    // Low liquidity = high risk
    const liquidityScore = trade.liquidityScore || 1;
    const pass = liquidityScore > 0.3;
    return {
      name: 'liquidity',
      pass,
      score: 1 - liquidityScore,
      reason: pass ? null : 'Insufficient liquidity for trade size',
    };
  }

  _checkGasViability(trade) {
    const profitAfterGas = (trade.profitBps || 0n) - (trade.gasBps || 10n);
    const pass = profitAfterGas > 0n;
    return {
      name: 'gas_viability',
      pass,
      score: pass ? 0.1 : 1.0,
      reason: pass ? null : `Profit after gas is negative: ${profitAfterGas} bps`,
    };
  }

  _checkConcentrationRisk(trade, portfolio) {
    const samePair = (portfolio.openPositions || []).filter(p => p.pair === trade.pair);
    const pass = samePair.length < 3;
    return {
      name: 'concentration',
      pass,
      score: pass ? 0.1 : 0.8,
      reason: pass ? null : `Too many positions in ${trade.pair}`,
    };
  }

  recordTradeResult(pnl) {
    this.dailyPnl += pnl;
    this.dailyTradeCount++;
  }

  _resetDailyIfNewDay() {
    const now = Date.now();
    if (now - this.lastReset > 86400000) {
      this.dailyPnl = 0n;
      this.dailyTradeCount = 0;
      this.lastReset = now;
    }
  }
}

module.exports = { RiskAssessor };

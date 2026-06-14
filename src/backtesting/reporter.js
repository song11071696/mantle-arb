/**
 * Backtest Reporter - Generates performance reports
 */

const { Logger } = require('../utils/logger');

class Reporter {
  constructor() {
    this.logger = new Logger('backtesting:reporter');
  }

  /**
   * Generate full backtest report
   */
  generate(results) {
    return {
      summary: this._summary(results),
      performance: this._performanceMetrics(results),
      riskMetrics: this._riskMetrics(results),
      tradeAnalysis: this._tradeAnalysis(results),
    };
  }

  _summary(r) {
    return [
      '═══════════════════════════════════════',
      '        BACKTEST RESULTS SUMMARY       ',
      '═══════════════════════════════════════',
      `Initial Capital : ${this._fmt(r.initialCapital)} ETH`,
      `Final Capital   : ${this._fmt(r.finalCapital)} ETH`,
      `Total P&L       : ${this._fmt(r.totalPnl)} ETH`,
      `Total Return    : ${Number(r.totalReturnBps) / 100}%`,
      `Total Trades    : ${r.totalTrades}`,
      `Win Rate        : ${r.winRate.toFixed(2)}%`,
      `Max Drawdown    : ${r.maxDrawdownPercent}%`,
      '═══════════════════════════════════════',
    ].join('\n');
  }

  _performanceMetrics(r) {
    const winning = r.trades.filter(t => t.pnl > 0n);
    const losing = r.trades.filter(t => t.pnl <= 0n);
    const avgWin = winning.length > 0
      ? winning.reduce((s, t) => s + t.pnl, 0n) / BigInt(winning.length) : 0n;
    const avgLoss = losing.length > 0
      ? losing.reduce((s, t) => s + t.pnl, 0n) / BigInt(losing.length) : 0n;
    const largestWin = winning.length > 0
      ? winning.reduce((m, t) => t.pnl > m ? t.pnl : m, 0n) : 0n;
    const largestLoss = losing.length > 0
      ? losing.reduce((m, t) => t.pnl < m ? t.pnl : m, 0n) : 0n;

    return {
      avgWin: avgWin.toString(),
      avgLoss: avgLoss.toString(),
      largestWin: largestWin.toString(),
      largestLoss: largestLoss.toString(),
      profitFactor: avgLoss !== 0n ? Number(avgWin * 100n / (avgLoss < 0n ? -avgLoss : avgLoss)) / 100 : 0,
    };
  }

  _riskMetrics(r) {
    const returns = [];
    for (let i = 1; i < r.equityCurve.length; i++) {
      const prev = r.equityCurve[i - 1].value;
      const curr = r.equityCurve[i].value;
      if (prev > 0n) returns.push(Number((curr - prev) * 10000n / prev) / 10000);
    }

    const mean = returns.reduce((s, v) => s + v, 0) / (returns.length || 1);
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(365 * 24 * 60) : 0;

    return {
      sharpeRatio: sharpe.toFixed(4),
      volatility: (stdDev * 100).toFixed(2) + '%',
      maxDrawdownPercent: r.maxDrawdownPercent,
    };
  }

  _tradeAnalysis(r) {
    const byStrategy = {};
    for (const t of r.trades) {
      if (!byStrategy[t.strategy]) byStrategy[t.strategy] = { count: 0, pnl: 0n };
      byStrategy[t.strategy].count++;
      byStrategy[t.strategy].pnl += t.pnl;
    }
    return { byStrategy };
  }

  _fmt(wei) {
    return (Number(wei) / 1e18).toFixed(4);
  }
}

module.exports = { Reporter };

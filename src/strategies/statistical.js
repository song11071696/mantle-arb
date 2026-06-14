/**
 * Statistical Arbitrage Strategy
 * Mean-reversion and correlation-based trading signals
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class StatisticalStrategy {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('strategy:statistical');
    this.name = 'statistical';
    this.enabled = true;
    this.lookbackPeriod = config?.statistical?.lookbackPeriod || 100;
    this.zScoreThreshold = config?.statistical?.zScoreThreshold || 2.0;
    this.priceHistory = new Map(); // pair -> price[]
  }

  /**
   * Update price history and scan for mean-reversion signals
   * @param {Object} currentPrices - Map of pair -> { price, timestamp }
   * @returns {Object[]} - Statistical arbitrage signals
   */
  async scan(currentPrices) {
    const signals = [];

    for (const [pair, data] of Object.entries(currentPrices)) {
      this._updateHistory(pair, data.price);

      const history = this.priceHistory.get(pair) || [];
      if (history.length < this.lookbackPeriod) continue;

      const signal = this._generateSignal(pair, history);
      if (signal) signals.push(signal);
    }

    return signals;
  }

  _updateHistory(pair, price) {
    if (!this.priceHistory.has(pair)) this.priceHistory.set(pair, []);
    const history = this.priceHistory.get(pair);
    history.push(Number(price));
    if (history.length > this.lookbackPeriod * 2) {
      history.splice(0, history.length - this.lookbackPeriod);
    }
  }

  _generateSignal(pair, history) {
    const current = history[history.length - 1];
    const mean = MathUtils.sma(history, this.lookbackPeriod);
    const std = MathUtils.stdDev(history.slice(-this.lookbackPeriod));

    if (std === 0 || !mean) return null;

    const zScore = (current - mean) / std;

    if (Math.abs(zScore) < this.zScoreThreshold) return null;

    const direction = zScore > 0 ? 'sell' : 'buy'; // mean reversion
    const confidence = Math.min(Math.abs(zScore) / 4, 1);

    return {
      strategy: this.name,
      pair,
      signal: direction,
      zScore,
      mean,
      std,
      currentPrice: current,
      confidence,
      expectedReversion: mean,
      profitPotential: Math.abs(current - mean),
    };
  }

  /**
   * Correlation analysis between two pairs
   */
  static correlation(seriesA, seriesB) {
    const n = Math.min(seriesA.length, seriesB.length);
    if (n < 2) return 0;

    const a = seriesA.slice(-n);
    const b = seriesB.slice(-n);
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;

    let cov = 0, varA = 0, varB = 0;
    for (let i = 0; i < n; i++) {
      const dA = a[i] - meanA;
      const dB = b[i] - meanB;
      cov += dA * dB;
      varA += dA * dA;
      varB += dB * dB;
    }

    const denom = Math.sqrt(varA * varB);
    return denom === 0 ? 0 : cov / denom;
  }
}

module.exports = { StatisticalStrategy };

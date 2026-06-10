/**
 * Price Predictor - ML-based price prediction using historical data
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class PricePredictor {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('ai:price-predictor');
    this.windowSize = config?.ai?.predictionWindow || 60;
    this.models = new Map(); // pair -> model weights
  }

  /**
   * Simple linear regression-based prediction
   * @param {number[]} prices - Historical price array
   * @param {number} horizon - Prediction steps ahead
   * @returns {Object} - { prediction, confidence, trend }
   */
  predict(prices, horizon = 5) {
    if (prices.length < 10) {
      return { prediction: null, confidence: 0, trend: 'unknown' };
    }

    const recent = prices.slice(-this.windowSize);
    const { slope, intercept, r2 } = this._linearRegression(recent);

    const prediction = intercept + slope * (recent.length + horizon);
    const trend = slope > 0 ? 'bullish' : slope < 0 ? 'bearish' : 'neutral';
    const confidence = Math.min(r2 * (recent.length / this.windowSize), 1);

    // Additional signals
    const ema = this._exponentialMA(recent, 12);
    const momentum = this._momentum(recent, 10);

    return {
      prediction,
      confidence,
      trend,
      slope,
      r2,
      ema: ema[ema.length - 1],
      momentum,
      supportLevel: Math.min(...recent.slice(-20)),
      resistanceLevel: Math.max(...recent.slice(-20)),
    };
  }

  /**
   * Linear regression on index -> price
   */
  _linearRegression(values) {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
      sumY2 += values[i] * values[i];
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: values[values.length - 1], r2: 0 };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const ssRes = values.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0);
    const ssTot = values.reduce((s, v) => s + (v - sumY / n) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { slope, intercept, r2 };
  }

  _exponentialMA(values, period) {
    const k = 2 / (period + 1);
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  _momentum(values, period) {
    if (values.length < period + 1) return 0;
    return (values[values.length - 1] - values[values.length - 1 - period]) / values[values.length - 1 - period];
  }
}

module.exports = { PricePredictor };

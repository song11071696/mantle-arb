/**
 * Signal Generator - Generates trading signals from multiple indicators
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class SignalGenerator {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('ai:signal-gen');
    this.confidenceThreshold = config?.ai?.confidenceThreshold || 0.7;
  }

  /**
   * Generate composite trading signal
   * @param {Object} data - { prices, volumes, prediction }
   * @returns {Object} - { action, confidence, reasons }
   */
  generate(data) {
    const signals = [];

    // RSI signal
    const rsi = this._rsi(data.prices, 14);
    if (rsi < 30) signals.push({ name: 'RSI', direction: 'buy', weight: 0.25, value: rsi });
    else if (rsi > 70) signals.push({ name: 'RSI', direction: 'sell', weight: 0.25, value: rsi });

    // MACD signal
    const macd = this._macd(data.prices);
    if (macd.histogram > 0) signals.push({ name: 'MACD', direction: 'buy', weight: 0.3, value: macd.histogram });
    else signals.push({ name: 'MACD', direction: 'sell', weight: 0.3, value: macd.histogram });

    // Bollinger Bands signal
    const bb = this._bollingerBands(data.prices, 20, 2);
    const lastPrice = data.prices[data.prices.length - 1];
    if (lastPrice < bb.lower) signals.push({ name: 'BB', direction: 'buy', weight: 0.2, value: lastPrice });
    else if (lastPrice > bb.upper) signals.push({ name: 'BB', direction: 'sell', weight: 0.2, value: lastPrice });

    // Volume signal
    if (data.volumes && data.volumes.length > 5) {
      const volSma = MathUtils.sma(data.volumes, 5);
      const currentVol = data.volumes[data.volumes.length - 1];
      if (currentVol > volSma * 1.5) {
        signals.push({ name: 'Volume', direction: 'confirm', weight: 0.15, value: currentVol / volSma });
      }
    }

    // AI prediction signal
    if (data.prediction) {
      signals.push({ name: 'AI', direction: data.prediction.trend === 'bullish' ? 'buy' : 'sell', weight: 0.1, value: data.prediction.confidence });
    }

    return this._compositeSignal(signals);
  }

  _compositeSignal(signals) {
    if (signals.length === 0) return { action: 'hold', confidence: 0, reasons: [] };

    let buyScore = 0, sellScore = 0, totalWeight = 0;
    const reasons = [];

    for (const s of signals) {
      totalWeight += s.weight;
      if (s.direction === 'buy') buyScore += s.weight;
      else if (s.direction === 'sell') sellScore += s.weight;
      reasons.push(`${s.name}: ${s.direction} (${s.value})`);
    }

    const normalizedBuy = totalWeight > 0 ? buyScore / totalWeight : 0;
    const normalizedSell = totalWeight > 0 ? sellScore / totalWeight : 0;

    let action = 'hold';
    let confidence = 0;

    if (normalizedBuy > normalizedSell && normalizedBuy > this.confidenceThreshold) {
      action = 'buy';
      confidence = normalizedBuy;
    } else if (normalizedSell > normalizedBuy && normalizedSell > this.confidenceThreshold) {
      action = 'sell';
      confidence = normalizedSell;
    }

    return { action, confidence, reasons, buyScore: normalizedBuy, sellScore: normalizedSell };
  }

  _rsi(prices, period) {
    if (prices.length < period + 1) return 50;
    const changes = [];
    for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);
    const recent = changes.slice(-period);
    const gains = recent.filter(c => c > 0);
    const losses = recent.filter(c => c < 0).map(c => -c);
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  _macd(prices) {
    const ema12 = this._ema(prices, 12);
    const ema26 = this._ema(prices, 26);
    const macdLine = ema12 - ema26;
    const signal = macdLine * 0.8; // simplified signal line
    return { macdLine, signal, histogram: macdLine - signal };
  }

  _ema(values, period) {
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) ema = values[i] * k + ema * (1 - k);
    return ema;
  }

  _bollingerBands(prices, period, stdMult) {
    const sma = MathUtils.sma(prices, period);
    const std = MathUtils.stdDev(prices.slice(-period));
    return { upper: sma + std * stdMult, middle: sma, lower: sma - std * stdMult };
  }
}

module.exports = { SignalGenerator };

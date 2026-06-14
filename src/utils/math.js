/**
 * Math utilities for arbitrage calculations
 */

class MathUtils {
  /**
   * Calculate profit percentage
   */
  static profitPercent(buyPrice, sellPrice) {
    if (!buyPrice || buyPrice === 0n) return 0n;
    return ((sellPrice - buyPrice) * 10000n) / buyPrice;
  }

  /**
   * Calculate price impact for a given liquidity and trade size
   */
  static priceImpact(reserveIn, reserveOut, amountIn) {
    const numerator = reserveOut * amountIn;
    const denominator = reserveIn + amountIn;
    return numerator / denominator;
  }

  /**
   * Constant product AMM: get output amount
   */
  static getAmountOut(amountIn, reserveIn, reserveOut, feeBps = 30n) {
    const amountInWithFee = amountIn * (10000n - feeBps);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 10000n + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * Calculate optimal trade size for max profit given reserves
   */
  static optimalTradeSize(reserveA, reserveB, feeBps = 30n) {
    const feeFactor = 10000n - feeBps;
    const sqrtTerm = sqrt(reserveA * reserveB * feeFactor / 10000n);
    return sqrtTerm > reserveA ? sqrtTerm - reserveA : 0n;
  }

  /**
   * Slippage calculation
   */
  static slippage(expectedPrice, actualPrice) {
    if (expectedPrice === 0n) return 0n;
    const diff = expectedPrice > actualPrice
      ? expectedPrice - actualPrice
      : actualPrice - expectedPrice;
    return (diff * 10000n) / expectedPrice;
  }

  /**
   * Weighted average price
   */
  static weightedAvgPrice(prices, weights) {
    let totalWeight = 0n;
    let weightedSum = 0n;
    for (let i = 0; i < prices.length; i++) {
      weightedSum += prices[i] * weights[i];
      totalWeight += weights[i];
    }
    return totalWeight > 0n ? weightedSum / totalWeight : 0n;
  }

  /**
   * Simple moving average for float arrays
   */
  static sma(values, period) {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Standard deviation for float arrays
   */
  static stdDev(values) {
    const n = values.length;
    if (n < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sqDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (n - 1));
  }

  /**
   * BPS to decimal
   */
  static bpsToDecimal(bps) {
    return Number(bps) / 10000;
  }
}

function sqrt(value) {
  if (value < 0n) throw new Error('sqrt of negative');
  if (value === 0n) return 0n;
  let z = (value + 1n) / 2n;
  let y = value;
  while (z < y) {
    y = z;
    z = (value / z + z) / 2n;
  }
  return y;
}

module.exports = { MathUtils, sqrt };

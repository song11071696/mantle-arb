/**
 * Cross-DEX Arbitrage Strategy
 * Finds price discrepancies for the same pair across different DEXes
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class CrossDexStrategy {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('strategy:cross-dex');
    this.name = 'cross-dex';
    this.enabled = true;
  }

  /**
   * Scan for cross-DEX arbitrage opportunities
   * @param {Object} dexPrices - Map of dex -> pair -> price
   * @param {bigint} tradeSize
   * @returns {Object[]} - Profitable cross-DEX trades
   */
  async scan(dexPrices, tradeSize) {
    const opportunities = [];
    const dexNames = Object.keys(dexPrices);
    const allPairs = new Set();

    for (const dex of dexNames) {
      for (const pair of Object.keys(dexPrices[dex])) {
        allPairs.add(pair);
      }
    }

    for (const pair of allPairs) {
      const prices = [];
      for (const dex of dexNames) {
        if (dexPrices[dex][pair]) {
          prices.push({ dex, ...dexPrices[dex][pair] });
        }
      }

      if (prices.length < 2) continue;

      const sorted = [...prices].sort((a, b) => (a.price < b.price ? -1 : 1));
      const cheapest = sorted[0];
      const priciest = sorted[sorted.length - 1];

      const grossProfitBps = MathUtils.profitPercent(cheapest.price, priciest.price);
      const estimatedGasBps = BigInt(this.config?.trading?.gasOverheadBps || 15);
      const netProfitBps = grossProfitBps - estimatedGasBps;

      if (netProfitBps > 0n) {
        const outputAmount = MathUtils.getAmountOut(
          tradeSize,
          cheapest.reserveIn || tradeSize * 100n,
          cheapest.reserveOut || tradeSize * 100n,
          cheapest.feeBps || 30n
        );

        opportunities.push({
          strategy: this.name,
          pair,
          buyDex: cheapest.dex,
          sellDex: priciest.dex,
          buyPrice: cheapest.price,
          sellPrice: priciest.price,
          grossProfitBps,
          netProfitBps,
          inputAmount: tradeSize,
          outputAmount,
        });
      }
    }

    return opportunities.sort((a, b) => Number(b.netProfitBps - a.netProfitBps));
  }

  /**
   * Get price from specific DEX
   */
  async fetchPrice(dexAdapter, tokenA, tokenB) {
    try {
      const quote = await dexAdapter.getAmountsOut(1000000n, [tokenA, tokenB]);
      return quote[1];
    } catch (e) {
      this.logger.warn(`Price fetch failed for ${tokenA}/${tokenB}: ${e.message}`);
      return null;
    }
  }
}

module.exports = { CrossDexStrategy };

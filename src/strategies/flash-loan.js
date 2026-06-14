/**
 * Flash Loan Arbitrage Strategy
 * Uses flash loans to execute large arbitrage trades with zero capital
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class FlashLoanStrategy {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('strategy:flash-loan');
    this.name = 'flash-loan';
    this.enabled = true;
    this.flashLoanFeeBps = config?.flashLoan?.feeBps || 9n; // 0.09% typical
  }

  /**
   * Scan for flash loan arbitrage opportunities
   * Combines triangular + cross-dex with flash loan capital
   * @param {Object} marketData - Combined DEX and pair data
   * @returns {Object[]} - Flash loan opportunities
   */
  async scan(marketData) {
    const opportunities = [];
    const { dexPrices, pairs, flashLoanProviders } = marketData;

    for (const provider of flashLoanProviders || []) {
      const maxBorrow = provider.maxBorrowAmount || 1000000000000000000000n; // 1000 ETH

      // Try various borrow sizes to find optimal
      const sizes = this._generateBorrowSizes(maxBorrow);

      for (const size of sizes) {
        const fee = (size * this.flashLoanFeeBps) / 10000n;
        const requiredReturn = size + fee;

        // Check cross-dex with this borrow size
        if (dexPrices) {
          const crossDexOpps = await this._scanCrossDex(dexPrices, size, requiredReturn);
          opportunities.push(...crossDexOpps);
        }

        // Check triangular with this borrow size
        if (pairs) {
          const triOpps = await this._scanTriangular(pairs, size, requiredReturn);
          opportunities.push(...triOpps);
        }
      }
    }

    return opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));
  }

  _generateBorrowSizes(maxBorrow) {
    const sizes = [];
    let size = maxBorrow / 100n;
    while (size <= maxBorrow) {
      sizes.push(size);
      size = size * 2n;
    }
    return sizes;
  }

  async _scanCrossDex(dexPrices, borrowAmount, requiredReturn) {
    const opps = [];
    const dexNames = Object.keys(dexPrices);
    const allPairs = new Set();
    for (const dex of dexNames) {
      for (const pair of Object.keys(dexPrices[dex])) allPairs.add(pair);
    }

    for (const pair of allPairs) {
      const prices = [];
      for (const dex of dexNames) {
        if (dexPrices[dex][pair]) prices.push({ dex, ...dexPrices[dex][pair] });
      }
      if (prices.length < 2) continue;

      prices.sort((a, b) => (a.price < b.price ? -1 : 1));
      const buy = prices[0];
      const sell = prices[prices.length - 1];

      const outputAmount = MathUtils.getAmountOut(borrowAmount, buy.reserveIn, buy.reserveB, buy.feeBps || 30n);
      if (outputAmount > requiredReturn) {
        const netProfit = outputAmount - requiredReturn;
        opps.push({
          strategy: this.name,
          type: 'cross-dex-flash',
          pair,
          borrowAmount,
          flashLoanFee: requiredReturn - borrowAmount,
          buyDex: buy.dex,
          sellDex: sell.dex,
          outputAmount,
          netProfit,
          netProfitBps: MathUtils.profitPercent(borrowAmount, netProfit),
        });
      }
    }
    return opps;
  }

  async _scanTriangular(pairs, borrowAmount, requiredReturn) {
    // Reuse triangular logic with flash loan capital
    const graph = {};
    for (const pair of pairs) {
      if (!graph[pair.tokenA]) graph[pair.tokenA] = [];
      if (!graph[pair.tokenB]) graph[pair.tokenB] = [];
      graph[pair.tokenA].push({ token: pair.tokenB, pair });
      graph[pair.tokenB].push({ token: pair.tokenA, pair });
    }

    const opps = [];
    for (const startToken of Object.keys(graph)) {
      let amount = borrowAmount;
      const path = [startToken];
      let current = startToken;

      // Simple 3-hop cycle
      for (let hop = 0; hop < 3; hop++) {
        const edges = graph[current] || [];
        if (edges.length === 0) break;
        const edge = edges[0];
        const out = MathUtils.getAmountOut(amount, edge.pair.reserveA, edge.pair.reserveB, edge.pair.feeBps || 30n);
        amount = out;
        current = edge.token;
        path.push(current);
      }

      if (current === startToken && amount > requiredReturn) {
        opps.push({
          strategy: this.name,
          type: 'triangular-flash',
          path,
          borrowAmount,
          outputAmount: amount,
          netProfit: amount - requiredReturn,
        });
      }
    }
    return opps;
  }
}

module.exports = { FlashLoanStrategy };

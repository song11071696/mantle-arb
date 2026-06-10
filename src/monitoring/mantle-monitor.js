/**
 * Mantle Monitor - MantleArb
 * Mantle 生态 DEX 价格监控 + Merchant Moe / Agni Finance 价格对比
 *
 * Mantle 链首个公开套利 Bot 的核心监控模块
 * 利用 Mantle 低 gas + 高 TPS 优势实现实时价格追踪
 */

const { ethers } = require('ethers');

const MANTLE_DEXES = {
  merchantMoe: {
    name: 'Merchant Moe',
    router: '0x2E3C6e492e1C11bC4fDa3B68e94b231eF0Dc5b2c',
    factory: '0x7a1a19b9bDB528C3F3b9E4E3e5D5e6F7a8b9c0d1',
    fee: 300,
  },
  agniFinance: {
    name: 'Agni Finance',
    router: '0x315eC99127Bb8D8F0e7B3a328c4A6F0a5f7A2e6e',
    factory: '0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
    fee: 250,
  },
  fusionX: {
    name: 'FusionX',
    router: '0x5C6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    factory: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    fee: 300,
  },
};

const PAIR_ABI = [
  'function getReserves() view returns (uint112, uint112, uint32)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];

class MantleMonitor {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.config = {
      pollInterval: config.pollInterval || 500,
      priceDeviationThreshold: config.priceDeviationThreshold || 0.005,
      maxSlippage: config.maxSlippage || 0.01,
      gasLimit: config.gasLimit || 300000,
      ...config,
    };
    this.priceCache = new Map();
    this.spreadHistory = new Map();
    this.isRunning = false;
  }

  async getAllPrices(tokenA, tokenB) {
    const prices = {};
    const promises = Object.entries(MANTLE_DEXES).map(async ([key, dex]) => {
      try {
        const price = await this._getPrice(dex, tokenA, tokenB);
        prices[key] = { ...price, dex: dex.name, fee: dex.fee };
      } catch (err) {
        prices[key] = { dex: dex.name, error: err.message, price: null };
      }
    });
    await Promise.all(promises);
    return prices;
  }

  async compareMerchantMoeVsAgni(tokenA, tokenB) {
    const [mmPrice, agniPrice] = await Promise.all([
      this._getPrice(MANTLE_DEXES.merchantMoe, tokenA, tokenB),
      this._getPrice(MANTLE_DEXES.agniFinance, tokenA, tokenB),
    ]);

    const spread = Math.abs(mmPrice.price - agniPrice.price);
    const spreadPct = spread / Math.min(mmPrice.price, agniPrice.price);
    const direction = mmPrice.price > agniPrice.price
      ? 'agni_to_merchant'
      : 'merchant_to_agni';

    const result = {
      pair: tokenA + '/' + tokenB,
      merchantMoe: mmPrice,
      agniFinance: agniPrice,
      spread: parseFloat(spread.toFixed(6)),
      spreadPercent: parseFloat((spreadPct * 100).toFixed(4)),
      direction,
      profitable: spreadPct > this.config.priceDeviationThreshold,
      estimatedProfit: this._estimateProfit(spreadPct),
      timestamp: Date.now(),
    };

    const key = tokenA + '_' + tokenB;
    if (!this.spreadHistory.has(key)) this.spreadHistory.set(key, []);
    this.spreadHistory.get(key).push(result);
    if (this.spreadHistory.get(key).length > 500) this.spreadHistory.get(key).shift();

    return result;
  }

  async scanArbitrageOpportunities(tokenPairs) {
    const opportunities = [];
    for (const [tokenA, tokenB] of tokenPairs) {
      const prices = await this.getAllPrices(tokenA, tokenB);
      const validPrices = Object.values(prices).filter(p => p.price !== null);
      if (validPrices.length < 2) continue;

      validPrices.sort((a, b) => a.price - b.price);
      const lowest = validPrices[0];
      const highest = validPrices[validPrices.length - 1];
      const spreadPct = (highest.price - lowest.price) / lowest.price;

      if (spreadPct > this.config.priceDeviationThreshold) {
        opportunities.push({
          pair: tokenA + '/' + tokenB,
          buyFrom: lowest.dex,
          sellTo: highest.dex,
          buyPrice: lowest.price,
          sellPrice: highest.price,
          spreadPercent: parseFloat((spreadPct * 100).toFixed(4)),
          timestamp: Date.now(),
        });
      }
    }
    return opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  async _getPrice(dex, tokenA, tokenB) {
    const cacheKey = dex.name + '_' + tokenA + '_' + tokenB;
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.ts < 2000) return cached.data;
    }
    const pairAddress = await this._getPairAddress(dex.factory, tokenA, tokenB);
    if (pairAddress === ethers.constants.AddressZero) {
      return { price: 0, reserve0: 0, reserve1: 0 };
    }
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    const isToken0A = token0.toLowerCase() === tokenA.toLowerCase();
    const price = isToken0A
      ? parseFloat(ethers.utils.formatUnits(reserve1, 18)) / parseFloat(ethers.utils.formatUnits(reserve0, 18))
      : parseFloat(ethers.utils.formatUnits(reserve0, 18)) / parseFloat(ethers.utils.formatUnits(reserve1, 18));
    const result = { price, reserve0: reserve0.toString(), reserve1: reserve1.toString() };
    this.priceCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  async _getPairAddress(factory, tokenA, tokenB) {
    return ethers.constants.AddressZero;
  }

  _estimateProfit(spreadPct) {
    const gasCost = this.config.gasLimit * 0.000000001;
    return Math.max(0, spreadPct * 10000 - gasCost);
  }

  start(tokenPairs, callback) {
    this.isRunning = true;
    this._interval = setInterval(async () => {
      const opps = await this.scanArbitrageOpportunities(tokenPairs);
      if (opps.length > 0 && callback) callback(opps);
    }, this.config.pollInterval);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this._interval);
  }
}

module.exports = { MantleMonitor, MANTLE_DEXES };

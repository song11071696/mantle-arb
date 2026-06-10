/**
 * Price Monitor - Real-time price tracking across DEXes
 * 
 * Uses RunnableBase for lifecycle management.
 */

const { RunnableBase } = require('../core/runnable-base');

class PriceMonitor extends RunnableBase {
  constructor(config = {}) {
    super({
      name: 'price-monitor',
      tickIntervalMs: config?.monitoring?.priceUpdateIntervalMs || 1000,
    });
    this.config = config;
    this.prices = new Map(); // `${dex}:${pair}` -> { price, timestamp, volume }
    this._dexAdapters = [];
    this._pairs = [];
  }

  /**
   * Configure adapters and pairs, then start via RunnableBase lifecycle
   */
  configure(dexAdapters, pairs) {
    this._dexAdapters = dexAdapters || [];
    this._pairs = pairs || [];
  }

  /**
   * Legacy start compat: configure then start
   */
  async start(dexAdapters, pairs) {
    if (dexAdapters) this._dexAdapters = dexAdapters;
    if (pairs) this._pairs = pairs;
    this.logger.info(
      `Monitoring ${this._pairs.length} pairs across ${this._dexAdapters.length} DEXes`
    );
    await super.start();
  }

  /**
   * controlTask: fetch prices for all dex/pair combinations
   */
  async controlTask() {
    for (const dex of this._dexAdapters) {
      for (const pair of this._pairs) {
        try {
          const data = await this._fetchPrice(dex, pair);
          if (data) {
            const key = `${dex.name}:${pair}`;
            const prev = this.prices.get(key);
            this.prices.set(key, data);

            if (prev && prev.price !== data.price) {
              const changeBps =
                ((data.price - prev.price) * 10000n) / prev.price;
              this.emit('priceChange', {
                dex: dex.name,
                pair,
                ...data,
                changeBps,
              });
            }
          }
        } catch (e) {
          this.logger.debug(`Price fetch error: ${e.message}`);
        }
      }
    }
  }

  async _fetchPrice(dex, pair) {
    try {
      const [tokenA, tokenB] = pair.split('/');
      const quote = await dex.getAmountsOut(1000000n, [tokenA, tokenB]);
      return { price: quote[1], timestamp: Date.now(), volume: 0n };
    } catch {
      return null;
    }
  }

  getPrice(dex, pair) {
    return this.prices.get(`${dex}:${pair}`);
  }

  getAllPrices() {
    const result = {};
    for (const [key, val] of this.prices) result[key] = val;
    return result;
  }
}

module.exports = { PriceMonitor };

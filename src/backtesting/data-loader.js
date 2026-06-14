/**
 * Data Loader - Loads historical data for backtesting
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class DataLoader {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
    this.logger = new Logger('backtesting:data-loader');
    this.cache = new Map();
  }

  /**
   * Load OHLCV data from CSV or JSON
   */
  async loadOHLCV(pair, startTime, endTime) {
    const cacheKey = `ohlcv:${pair}:${startTime}:${endTime}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const filePath = path.join(this.dataDir, `${pair.replace('/', '_')}.json`);
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Data file not found: ${filePath}`);
      return this._generateSyntheticData(pair, startTime, endTime);
    }

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const filtered = raw.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
      this.cache.set(cacheKey, filtered);
      return filtered;
    } catch (e) {
      this.logger.error(`Failed to load data: ${e.message}`);
      return [];
    }
  }

  /**
   * Load DEX liquidity snapshots
   */
  async loadLiquidity(dex, pair, timestamp) {
    const filePath = path.join(this.dataDir, 'liquidity', `${dex}_${pair.replace('/', '_')}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Find closest snapshot to timestamp
      let closest = raw[0];
      for (const snap of raw) {
        if (Math.abs(snap.timestamp - timestamp) < Math.abs(closest.timestamp - timestamp)) {
          closest = snap;
        }
      }
      return closest;
    } catch (e) {
      this.logger.error(`Liquidity load failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Generate synthetic price data for testing
   */
  _generateSyntheticData(pair, startTime, endTime) {
    this.logger.info(`Generating synthetic data for ${pair}`);
    const data = [];
    const interval = 60000; // 1 minute
    let price = 1000 + Math.random() * 1000;
    let t = startTime;

    while (t <= endTime) {
      const change = (Math.random() - 0.5) * 0.02;
      price *= (1 + change);
      data.push({
        timestamp: t,
        open: price * (1 - Math.random() * 0.005),
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        volume: Math.random() * 1000000,
      });
      t += interval;
    }
    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = { DataLoader };

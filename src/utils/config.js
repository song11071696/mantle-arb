/**
 * Configuration management
 */

const path = require('path');
const fs = require('fs');

const DEFAULTS = {
  network: {
    name: 'mantle',
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    wsUrl: 'wss://ws.mantle.xyz',
  },
  trading: {
    minProfitBps: 50,
    maxSlippageBps: 100,
    maxTradeSizeEth: '10',
    gasLimitBuffer: 1.2,
    maxGasPriceGwei: 100,
  },
  dexes: {
    agniFinance: { router: '', factory: '', feeBps: 30 },
    fusionX: { router: '', factory: '', feeBps: 30 },
    merchantMoe: { router: '', factory: '', feeBps: 30 },
  },
  monitoring: {
    priceUpdateIntervalMs: 1000,
    alertCooldownMs: 60000,
    enableWebSocket: true,
  },
  ai: {
    predictionWindow: 60,
    confidenceThreshold: 0.7,
    retrainIntervalHours: 24,
  },
  logging: {
    level: 'info',
    maxLogEntries: 10000,
  },
};

class Config {
  constructor(configPath) {
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
    this.config = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.config = this._deepMerge(this.config, raw);
      }
    } catch (e) {
      console.warn(`Config load failed, using defaults: ${e.message}`);
    }
  }

  get(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  set(keyPath, value) {
    const keys = keyPath.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (e) {
      console.error(`Config save failed: ${e.message}`);
    }
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

module.exports = { Config, DEFAULTS };

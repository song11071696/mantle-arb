/**
 * Monitoring Module Entry Point
 */

const { PriceMonitor } = require('./price-monitor');
const { TradeMonitor } = require('./trade-monitor');
const { AlertManager } = require('./alert-manager');
const { RunnableBase } = require('../core/runnable-base');

class MonitoringSystem extends RunnableBase {
  constructor(config) {
    super({ name: 'monitoring-system' });
    this.config = config;
    this.priceMonitor = new PriceMonitor(config);
    this.tradeMonitor = new TradeMonitor(config);
    this.alertManager = new AlertManager(config);
    this._dexAdapters = [];
    this._pairs = [];
    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    this.priceMonitor.on('priceChange', (data) => {
      this.alertManager.evaluate({ [data.pair]: data });
    });

    this.tradeMonitor.on('tradeClosed', (trade) => {
      this.logger.info(`Trade closed: ${trade.strategy} PnL: ${trade.pnl}`);
    });

    this.alertManager.on('alert', (alert) => {
      // Could integrate with Telegram, Discord, etc.
      this.logger.warn(`[${alert.severity}] ${alert.message}`);
    });
  }

  async start(dexAdapters, pairs) {
    if (dexAdapters) this._dexAdapters = dexAdapters;
    if (pairs) this._pairs = pairs;

    // Start sub-components
    await this.priceMonitor.start(this._dexAdapters, this._pairs);
    await this.tradeMonitor.start();
    await super.start();
  }

  async stop() {
    await this.priceMonitor.stop();
    await this.tradeMonitor.stop();
    await super.stop();
  }

  getStatus() {
    return {
      priceMonitor: {
        running: this.priceMonitor.isRunning,
        trackedPairs: this.priceMonitor.prices.size,
      },
      tradeMonitor: this.tradeMonitor.getStats(),
      alertManager: {
        recentAlerts: this.alertManager.getRecentAlerts(5),
        rules: this.alertManager.rules.length,
      },
      ...super.getStatus(),
    };
  }
}

module.exports = { MonitoringSystem, PriceMonitor, TradeMonitor, AlertManager };

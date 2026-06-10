/**
 * Backtesting Module Entry Point
 */

const { BacktestEngine } = require('./engine');
const { DataLoader } = require('./data-loader');
const { Reporter } = require('./reporter');
const { Logger } = require('../utils/logger');

class BacktestRunner {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('backtesting');
    this.engine = new BacktestEngine(config);
    this.dataLoader = new DataLoader(config?.dataDir);
    this.reporter = new Reporter();
  }

  /**
   * Run full backtest pipeline
   */
  async run(strategy, pair, startTime, endTime) {
    this.logger.info(`Backtesting ${strategy.name} on ${pair}`);
    const data = await this.dataLoader.loadOHLCV(pair, startTime, endTime);
    if (data.length === 0) {
      this.logger.error('No data available for backtest');
      return null;
    }

    const results = await this.engine.run(strategy, data);
    const report = this.reporter.generate(results);

    this.logger.info('\n' + report.summary);
    return report;
  }
}

module.exports = { BacktestRunner, BacktestEngine, DataLoader, Reporter };

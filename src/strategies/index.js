/**
 * Strategy Manager - Orchestrates all arbitrage strategies
 */

const { TriangularStrategy } = require('./triangular');
const { CrossDexStrategy } = require('./cross-dex');
const { FlashLoanStrategy } = require('./flash-loan');
const { StatisticalStrategy } = require('./statistical');
const { Logger } = require('../utils/logger');

class StrategyManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('strategy-manager');
    this.strategies = new Map();
    this._initializeStrategies();
  }

  _initializeStrategies() {
    this.register('triangular', new TriangularStrategy(this.config));
    this.register('cross-dex', new CrossDexStrategy(this.config));
    this.register('flash-loan', new FlashLoanStrategy(this.config));
    this.register('statistical', new StatisticalStrategy(this.config));
  }

  register(name, strategy) {
    this.strategies.set(name, strategy);
    this.logger.info(`Registered strategy: ${name}`);
  }

  enable(name) {
    const s = this.strategies.get(name);
    if (s) { s.enabled = true; this.logger.info(`Enabled: ${name}`); }
  }

  disable(name) {
    const s = this.strategies.get(name);
    if (s) { s.enabled = false; this.logger.info(`Disabled: ${name}`); }
  }

  /**
   * Run all enabled strategies and collect opportunities
   */
  async scanAll(marketData) {
    const allOpps = [];
    const tasks = [];

    for (const [name, strategy] of this.strategies) {
      if (!strategy.enabled) continue;
      tasks.push(
        strategy.scan(marketData).catch(e => {
          this.logger.error(`Strategy ${name} failed: ${e.message}`);
          return [];
        })
      );
    }

    const results = await Promise.all(tasks);
    for (const opps of results) allOpps.push(...opps);

    // Deduplicate and rank
    return this._rankOpportunities(allOpps);
  }

  _rankOpportunities(opportunities) {
    // Remove duplicates and sort by profitability
    const seen = new Set();
    return opportunities
      .filter(opp => {
        const key = `${opp.strategy}-${opp.pair || opp.path?.join('-')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const profitA = Number(a.netProfitBps || a.profitBps || 0n);
        const profitB = Number(b.netProfitBps || b.profitBps || 0n);
        return profitB - profitA;
      });
  }

  getStrategy(name) {
    return this.strategies.get(name);
  }

  listStrategies() {
    return Array.from(this.strategies.entries()).map(([name, s]) => ({
      name,
      enabled: s.enabled,
    }));
  }
}

module.exports = { StrategyManager };

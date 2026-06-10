/**
 * Base Strategy - Abstract base class for all arbitrage strategies
 * 
 * Extends RunnableBase for unified lifecycle management (inspired by Hummingbot).
 * Provides common functionality:
 * - Lifecycle management via RunnableBase
 * - Risk management
 * - Position tracking
 * - Performance metrics
 * - Logging
 */

const { ethers } = require('ethers');
const { RunnableBase } = require('../core/runnable-base');

class BaseStrategy extends RunnableBase {
  constructor(config = {}) {
    super({
      name: config.name || 'BaseStrategy',
      logger: config.logger,
      tickIntervalMs: config.tickIntervalMs || 5000,
    });

    this.type = config.type || 'unknown';
    this.config = {
      maxTradeSize: config.maxTradeSize || 10000,
      minProfitBps: config.minProfitBps || 50,
      maxSlippageBps: config.maxSlippageBps || 100,
      maxDailyTrades: config.maxDailyTrades || 100,
      gasLimit: config.gasLimit || 500000,
      ...config,
    };

    // Performance tracking
    this.stats = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0n,
      totalLosses: 0n,
      netProfit: 0n,
      maxDrawdown: 0,
      peakEquity: 0n,
      currentEquity: 0n,
      lastTradeTime: 0,
      dailyTradeCount: 0,
      dailyResetTime: 0,
    };

    // Trade history
    this.trades = [];
  }

  /**
   * Compat: 'status' getter maps RunState to legacy values
   */
  get status() {
    if (this.isRunning) return 'active';
    if (this.state === 'stopping') return 'paused';
    return 'stopped';
  }

  set status(val) {
    // Legacy compatibility: only allow setting via start/stop/pause/resume
  }

  /**
   * Legacy start() compat: delegates to RunnableBase.start()
   * For strategies that don't use the tick loop, onStart does the work.
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn(`[${this.name}] Strategy already active`);
      return;
    }
    await super.start();
  }

  /**
   * Legacy stop() compat
   */
  async stop() {
    if (!this.isRunning) return;
    await super.stop();
  }

  /**
   * Pause the strategy (keeps it in RUNNING state but skips controlTask)
   */
  pause() {
    if (!this.isRunning) return;
    this._paused = true;
    this.logger.info(`[${this.name}] Strategy paused`);
    this.onPause();
  }

  /**
   * Resume the strategy
   */
  resume() {
    if (!this._paused) return;
    this._paused = false;
    this.logger.info(`[${this.name}] Strategy resumed`);
    this.onResume();
  }

  /**
   * Override onTick to support pause
   */
  async onTick() {
    return !this._paused;
  }

  /**
   * Lifecycle hooks for subclasses
   */
  async onStart() {}
  async onStop() {}
  onPause() {}
  onResume() {}

  /**
   * Default controlTask: scan for opportunities
   * Subclasses can override for custom behavior
   */
  async controlTask() {
    // Default: no-op. Subclasses override scan()/execute() or controlTask().
  }

  /**
   * Scan for arbitrage opportunities
   * @returns {Promise<Array>} Array of opportunities
   */
  async scan() {
    throw new Error('scan() must be implemented by subclass');
  }

  /**
   * Execute an arbitrage trade
   * @param {Object} opportunity - The opportunity to execute
   * @returns {Promise<Object>} Trade result
   */
  async execute(opportunity) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate if an opportunity meets risk criteria
   * @param {Object} opportunity - The opportunity to validate
   * @returns {boolean} Whether the opportunity is valid
   */
  validateOpportunity(opportunity) {
    // Check if strategy is active
    if (!this.isRunning) {
      return false;
    }

    // Check daily trade limit
    this._resetDailyCountIfNeeded();
    if (this.stats.dailyTradeCount >= this.config.maxDailyTrades) {
      this.logger.warn(`[${this.name}] Daily trade limit reached`);
      return false;
    }

    // Check trade size
    const amountIn = BigInt(opportunity.amountIn || 0);
    const maxTradeSize = ethers.parseEther(this.config.maxTradeSize.toString());
    if (amountIn > maxTradeSize) {
      this.logger.warn(`[${this.name}] Trade size exceeds limit`);
      return false;
    }

    // Check minimum profit
    const profitBps = opportunity.profitBps || 0;
    if (profitBps < this.config.minProfitBps) {
      return false;
    }

    return true;
  }

  /**
   * Record a trade result
   * @param {Object} trade - Trade details
   */
  recordTrade(trade) {
    const profit = BigInt(trade.profit || 0);
    const gasCost = BigInt(trade.gasCost || 0);
    const netProfit = profit - gasCost;

    this.stats.totalTrades++;
    this.stats.dailyTradeCount++;
    this.stats.lastTradeTime = Date.now();

    if (netProfit >= 0n) {
      this.stats.successfulTrades++;
      this.stats.totalProfit += netProfit;
    } else {
      this.stats.failedTrades++;
      this.stats.totalLosses += (-netProfit);
    }

    this.stats.netProfit = this.stats.totalProfit - this.stats.totalLosses;
    this.stats.currentEquity += netProfit;

    // Update max drawdown
    if (this.stats.currentEquity > this.stats.peakEquity) {
      this.stats.peakEquity = this.stats.currentEquity;
    }
    const drawdown = this.stats.peakEquity > 0n
      ? Number((this.stats.peakEquity - this.stats.currentEquity) * 10000n / this.stats.peakEquity) / 100
      : 0;
    if (drawdown > this.stats.maxDrawdown) {
      this.stats.maxDrawdown = drawdown;
    }

    // Store trade
    this.trades.push({
      ...trade,
      netProfit: netProfit.toString(),
      timestamp: Date.now(),
      strategy: this.name,
    });

    // Keep last 1000 trades
    if (this.trades.length > 1000) {
      this.trades = this.trades.slice(-1000);
    }
  }

  /**
   * Get strategy statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalProfit: this.stats.totalProfit.toString(),
      totalLosses: this.stats.totalLosses.toString(),
      netProfit: this.stats.netProfit.toString(),
      currentEquity: this.stats.currentEquity.toString(),
      peakEquity: this.stats.peakEquity.toString(),
      winRate: this.stats.totalTrades > 0
        ? (this.stats.successfulTrades / this.stats.totalTrades * 100)
        : 0,
      avgProfitPerTrade: this.stats.totalTrades > 0
        ? (this.stats.netProfit / BigInt(this.stats.totalTrades)).toString()
        : '0',
    };
  }

  /**
   * Get strategy configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update strategy configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`[${this.name}] Configuration updated`);
  }

  /**
   * Reset daily trade count if needed
   */
  _resetDailyCountIfNeeded() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - this.stats.dailyResetTime > dayMs) {
      this.stats.dailyTradeCount = 0;
      this.stats.dailyResetTime = now;
    }
  }

  /**
   * Serialize strategy state for persistence
   */
  serialize() {
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      config: this.config,
      stats: {
        ...this.stats,
        totalProfit: this.stats.totalProfit.toString(),
        totalLosses: this.stats.totalLosses.toString(),
        netProfit: this.stats.netProfit.toString(),
        currentEquity: this.stats.currentEquity.toString(),
        peakEquity: this.stats.peakEquity.toString(),
      },
      ...super.getStatus(),
    };
  }
}

module.exports = { BaseStrategy };

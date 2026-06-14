/**
 * Triple Barrier Risk Management (inspired by Hummingbot / ML4Trading)
 *
 * Implements the triple-barrier method for position risk management:
 * - Upper barrier (take profit): close position when profit target is hit
 * - Lower barrier (stop loss): close position when loss limit is hit
 * - Vertical barrier (time limit): close position after max hold time
 * - Trailing stop: dynamic stop loss that follows price in favorable direction
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');

/**
 * Default configuration for triple barrier
 */
const DEFAULT_CONFIG = {
  // Stop loss: close if unrealized loss exceeds this fraction (e.g. 0.02 = 2%)
  stopLossPct: 0.02,
  // Take profit: close if unrealized profit exceeds this fraction (e.g. 0.05 = 5%)
  takeProfitPct: 0.05,
  // Time limit in milliseconds (e.g. 3600000 = 1 hour)
  timeLimitMs: 3600000,
  // Trailing stop: fraction below peak price to trigger (e.g. 0.01 = 1%)
  trailingStopPct: 0.01,
  // Enable/disable individual barriers
  enableStopLoss: true,
  enableTakeProfit: true,
  enableTimeLimit: true,
  enableTrailingStop: false,
};

/**
 * Barrier type constants
 */
const BarrierType = {
  NONE: 'none',
  STOP_LOSS: 'stop_loss',
  TAKE_PROFIT: 'take_profit',
  TIME_LIMIT: 'time_limit',
  TRAILING_STOP: 'trailing_stop',
};

/**
 * Position states
 */
const PositionState = {
  OPEN: 'open',
  CLOSED_STOP_LOSS: 'closed_stop_loss',
  CLOSED_TAKE_PROFIT: 'closed_take_profit',
  CLOSED_TIME_LIMIT: 'closed_time_limit',
  CLOSED_TRAILING_STOP: 'closed_trailing_stop',
  CLOSED_MANUAL: 'closed_manual',
};

/**
 * Represents an active position being managed by triple barrier
 */
class ManagedPosition {
  constructor({ id, pair, side, entryPrice, size, timestamp }) {
    this.id = id || `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.pair = pair;
    this.side = side || 'long'; // 'long' or 'short'
    this.entryPrice = entryPrice; // number (float or bigint-convertible)
    this.size = size;
    this.openTime = timestamp || Date.now();
    this.state = PositionState.OPEN;
    this.peakPrice = entryPrice; // highest price seen (for trailing stop)
    this.troughPrice = entryPrice; // lowest price seen (for trailing stop on shorts)
    this.currentPrice = entryPrice;
    this.closeTime = null;
    this.closePrice = null;
    this.closeReason = null;
    this.pnl = 0;
    this.pnlPct = 0;
  }

  /**
   * Update current price and track peak/trough
   */
  updatePrice(price) {
    this.currentPrice = price;
    if (price > this.peakPrice) this.peakPrice = price;
    if (price < this.troughPrice) this.troughPrice = price;
  }

  /**
   * Close the position
   */
  close(price, reason) {
    this.closePrice = price;
    this.closeTime = Date.now();
    this.closeReason = reason;

    if (this.side === 'long') {
      this.pnl = price - this.entryPrice;
      this.pnlPct = this.entryPrice !== 0
        ? (price - this.entryPrice) / this.entryPrice
        : 0;
    } else {
      this.pnl = this.entryPrice - price;
      this.pnlPct = this.entryPrice !== 0
        ? (this.entryPrice - price) / this.entryPrice
        : 0;
    }

    switch (reason) {
      case BarrierType.STOP_LOSS:
        this.state = PositionState.CLOSED_STOP_LOSS;
        break;
      case BarrierType.TAKE_PROFIT:
        this.state = PositionState.CLOSED_TAKE_PROFIT;
        break;
      case BarrierType.TIME_LIMIT:
        this.state = PositionState.CLOSED_TIME_LIMIT;
        break;
      case BarrierType.TRAILING_STOP:
        this.state = PositionState.CLOSED_TRAILING_STOP;
        break;
      default:
        this.state = PositionState.CLOSED_MANUAL;
    }

    return { pnl: this.pnl, pnlPct: this.pnlPct, reason };
  }

  /**
   * Unrealized PnL for current price
   */
  getUnrealizedPnl() {
    if (this.side === 'long') {
      return {
        pnl: this.currentPrice - this.entryPrice,
        pnlPct: this.entryPrice !== 0
          ? (this.currentPrice - this.entryPrice) / this.entryPrice
          : 0,
      };
    }
    return {
      pnl: this.entryPrice - this.currentPrice,
      pnlPct: this.entryPrice !== 0
        ? (this.entryPrice - this.currentPrice) / this.entryPrice
        : 0,
    };
  }

  toJSON() {
    return {
      id: this.id,
      pair: this.pair,
      side: this.side,
      entryPrice: this.entryPrice,
      size: this.size,
      openTime: this.openTime,
      state: this.state,
      currentPrice: this.currentPrice,
      peakPrice: this.peakPrice,
      troughPrice: this.troughPrice,
      closeTime: this.closeTime,
      closePrice: this.closePrice,
      closeReason: this.closeReason,
      pnl: this.pnl,
      pnlPct: this.pnlPct,
    };
  }
}

/**
 * Triple Barrier Manager - evaluates open positions against barrier conditions
 */
class TripleBarrierManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger('risk:triple-barrier');
    this.positions = new Map(); // id -> ManagedPosition
    this.closedPositions = [];
    this.maxClosedHistory = config.maxClosedHistory || 500;
    this._timer = null;
    this._checkIntervalMs = config.checkIntervalMs || 1000;
  }

  /**
   * Open a new managed position
   */
  openPosition({ id, pair, side, entryPrice, size }) {
    const pos = new ManagedPosition({ id, pair, side, entryPrice, size });
    this.positions.set(pos.id, pos);
    this.logger.info(`Position opened: ${pos.id} ${side} ${pair} @ ${entryPrice}`);
    this.emit('positionOpened', pos.toJSON());
    return pos;
  }

  /**
   * Manually close a position
   */
  closePosition(id, price) {
    const pos = this.positions.get(id);
    if (!pos) return null;
    const result = pos.close(price, BarrierType.NONE);
    this._archivePosition(pos);
    this.logger.info(`Position manually closed: ${id} PnL=${result.pnlPct.toFixed(4)}`);
    return { ...pos.toJSON(), ...result };
  }

  /**
   * Update price for a position and evaluate barriers
   * Returns barrier type if a barrier was hit, otherwise null
   */
  evaluatePosition(positionId, currentPrice) {
    const pos = this.positions.get(positionId);
    if (!pos || pos.state !== PositionState.OPEN) return null;

    pos.updatePrice(currentPrice);

    // Check in priority order: stop loss > trailing stop > take profit > time limit
    const barrier = this._checkBarriers(pos);
    if (barrier !== BarrierType.NONE) {
      const result = pos.close(currentPrice, barrier);
      this._archivePosition(pos);
      this.logger.warn(
        `Barrier hit [${barrier}]: ${pos.id} closed @ ${currentPrice}, PnL=${(result.pnlPct * 100).toFixed(2)}%`
      );
      this.emit('barrierHit', { ...pos.toJSON(), barrier, ...result });
      return barrier;
    }

    return null;
  }

  /**
   * Evaluate all open positions with a price map
   * @param {Object} priceMap - { pair: currentPrice }
   */
  evaluateAll(priceMap) {
    const results = [];
    for (const [id, pos] of this.positions) {
      const price = priceMap[pos.pair];
      if (price !== undefined) {
        const barrier = this.evaluatePosition(id, price);
        if (barrier) results.push({ id, barrier });
      }
    }
    return results;
  }

  /**
   * Check all barriers for a position
   * @private
   */
  _checkBarriers(pos) {
    const cfg = this.config;

    // 1. Stop Loss check
    if (cfg.enableStopLoss) {
      const { pnlPct } = pos.getUnrealizedPnl();
      if (pnlPct <= -cfg.stopLossPct) {
        return BarrierType.STOP_LOSS;
      }
    }

    // 2. Trailing Stop check
    if (cfg.enableTrailingStop && cfg.trailingStopPct > 0) {
      if (pos.side === 'long') {
        // For longs: trailing stop triggers when price drops below peak by trailingStopPct
        const dropFromPeak = pos.peakPrice > 0
          ? (pos.peakPrice - pos.currentPrice) / pos.peakPrice
          : 0;
        if (dropFromPeak >= cfg.trailingStopPct && pos.peakPrice > pos.entryPrice) {
          return BarrierType.TRAILING_STOP;
        }
      } else {
        // For shorts: trailing stop triggers when price rises above trough by trailingStopPct
        const riseFromTrough = pos.troughPrice > 0
          ? (pos.currentPrice - pos.troughPrice) / pos.troughPrice
          : 0;
        if (riseFromTrough >= cfg.trailingStopPct && pos.troughPrice < pos.entryPrice) {
          return BarrierType.TRAILING_STOP;
        }
      }
    }

    // 3. Take Profit check
    if (cfg.enableTakeProfit) {
      const { pnlPct } = pos.getUnrealizedPnl();
      if (pnlPct >= cfg.takeProfitPct) {
        return BarrierType.TAKE_PROFIT;
      }
    }

    // 4. Time Limit check
    if (cfg.enableTimeLimit) {
      const elapsed = Date.now() - pos.openTime;
      if (elapsed >= cfg.timeLimitMs) {
        return BarrierType.TIME_LIMIT;
      }
    }

    return BarrierType.NONE;
  }

  /**
   * Move position to closed history
   * @private
   */
  _archivePosition(pos) {
    this.positions.delete(pos.id);
    this.closedPositions.push(pos.toJSON());
    if (this.closedPositions.length > this.maxClosedHistory) {
      this.closedPositions = this.closedPositions.slice(-this.maxClosedHistory);
    }
  }

  /**
   * Start periodic barrier evaluation (auto mode)
   * @param {Function} priceProvider - async function returning { pair: price }
   */
  startAutoEval(priceProvider) {
    if (this._timer) return;
    this._timer = setInterval(async () => {
      try {
        const prices = await priceProvider();
        this.evaluateAll(prices);
      } catch (e) {
        this.logger.error(`Auto-eval error: ${e.message}`);
      }
    }, this._checkIntervalMs);
    this.logger.info('Auto-evaluation started');
  }

  /**
   * Stop periodic evaluation
   */
  stopAutoEval() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.logger.info('Auto-evaluation stopped');
  }

  /**
   * Get aggregate statistics
   */
  getStats() {
    const closed = this.closedPositions;
    const wins = closed.filter(p => p.pnl > 0);
    const losses = closed.filter(p => p.pnl <= 0);
    const totalPnl = closed.reduce((sum, p) => sum + p.pnl, 0);
    const barrierCounts = {};
    for (const p of closed) {
      const reason = p.closeReason || 'manual';
      barrierCounts[reason] = (barrierCounts[reason] || 0) + 1;
    }

    return {
      openPositions: this.positions.size,
      closedPositions: closed.length,
      totalPnl,
      avgPnl: closed.length > 0 ? totalPnl / closed.length : 0,
      winRate: closed.length > 0 ? wins.length / closed.length : 0,
      wins: wins.length,
      losses: losses.length,
      avgWin: wins.length > 0
        ? wins.reduce((s, p) => s + p.pnl, 0) / wins.length
        : 0,
      avgLoss: losses.length > 0
        ? losses.reduce((s, p) => s + p.pnl, 0) / losses.length
        : 0,
      barrierCounts,
    };
  }

  /**
   * Get all open positions
   */
  getOpenPositions() {
    return Array.from(this.positions.values()).map(p => p.toJSON());
  }

  /**
   * Get recent closed positions
   */
  getClosedPositions(limit = 50) {
    return this.closedPositions.slice(-limit);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Triple barrier config updated');
  }
}

module.exports = {
  TripleBarrierManager,
  ManagedPosition,
  BarrierType,
  PositionState,
  DEFAULT_CONFIG,
};

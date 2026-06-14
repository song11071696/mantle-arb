/**
 * Trade Monitor - Tracks executed trades and performance
 * 
 * Uses RunnableBase for lifecycle management.
 */

const { RunnableBase } = require('../core/runnable-base');

class TradeMonitor extends RunnableBase {
  constructor(config = {}) {
    super({
      name: 'trade-monitor',
      tickIntervalMs: config?.monitoring?.tradeCheckIntervalMs || 5000,
    });
    this.config = config;
    this.trades = [];
    this.openPositions = new Map();
    this.stats = { totalTrades: 0, totalPnl: 0n, wins: 0, losses: 0 };
  }

  /**
   * controlTask: periodic check for stale open positions
   */
  async controlTask() {
    const staleThreshold = Date.now() - (this.config?.monitoring?.stalePositionMs || 300000);
    for (const [id, trade] of this.openPositions) {
      if (trade.timestamp < staleThreshold) {
        this.emit('stalePosition', trade);
      }
    }
  }

  /**
   * Record a new trade execution
   */
  recordTrade(trade) {
    const entry = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      strategy: trade.strategy,
      pair: trade.pair,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice || null,
      size: trade.size,
      pnl: trade.pnl || 0n,
      gasCost: trade.gasCost || 0n,
      status: trade.exitPrice ? 'closed' : 'open',
      txHash: trade.txHash || null,
    };

    this.trades.push(entry);
    this.stats.totalTrades++;

    if (entry.status === 'closed') {
      this._updateStats(entry);
      this.emit('tradeClosed', entry);
    } else {
      this.openPositions.set(entry.id, entry);
      this.emit('tradeOpened', entry);
    }

    return entry;
  }

  closeTrade(tradeId, exitPrice, pnl) {
    const trade = this.openPositions.get(tradeId);
    if (!trade) return null;

    trade.exitPrice = exitPrice;
    trade.pnl = pnl;
    trade.status = 'closed';
    this.openPositions.delete(tradeId);
    this._updateStats(trade);
    this.emit('tradeClosed', trade);
    return trade;
  }

  _updateStats(trade) {
    this.stats.totalPnl += trade.pnl;
    if (trade.pnl > 0n) this.stats.wins++;
    else this.stats.losses++;
  }

  getStats() {
    return {
      ...this.stats,
      winRate: this.stats.totalTrades > 0
        ? (this.stats.wins / this.stats.totalTrades * 100).toFixed(2) + '%'
        : '0%',
      openPositions: this.openPositions.size,
      recentTrades: this.trades.slice(-20),
      ...super.getStatus(),
    };
  }

  getTradesByStrategy(strategy) {
    return this.trades.filter(t => t.strategy === strategy);
  }
}

module.exports = { TradeMonitor };

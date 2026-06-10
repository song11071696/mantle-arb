/**
 * AgentMemory - Trade history recording and DEX performance analysis
 * MantleArb V3 - AI-Assisted Arbitrage Agent
 *
 * Responsibilities:
 *  - Record every trade execution (success/failure)
 *  - Track per-DEX performance metrics (win rate, avg profit, latency)
 *  - Persist memory to disk for cross-session learning
 *  - Provide analytics to the AI strategy engine
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MEMORY_DIR = path.join(__dirname, '..', '..', 'data', 'memory');
const TRADES_FILE = 'trade-history.json';
const DEX_STATS_FILE = 'dex-performance.json';
const MAX_HISTORY = 10000;

class AgentMemory {
  /**
   * @param {string} memoryDir - directory for persistent storage
   */
  constructor(memoryDir = DEFAULT_MEMORY_DIR) {
    this.memoryDir = memoryDir;
    this.trades = [];
    this.dexStats = {};  // dexName -> { trades, wins, losses, totalProfit, totalLoss, avgLatencyMs }
    this._ensureDir();
    this._load();
  }

  // ──────────────────────────────────────────────
  //  Trade Recording
  // ──────────────────────────────────────────────

  /**
   * Record a completed trade.
   * @param {Object} trade
   * @param {string}  trade.tokenPair   - e.g. "USDC/WETH"
   * @param {string}  trade.buyFrom     - DEX name bought from
   * @param {string}  trade.sellTo      - DEX name sold to
   * @param {number}  trade.spread      - spread in basis points
   * @param {number}  trade.profit      - net profit in USD
   * @param {boolean} trade.success     - whether trade succeeded on-chain
   * @param {string}  [trade.txHash]    - transaction hash
   * @param {boolean} [trade.usedFlashLoan=false]
   * @param {number}  [trade.gasUsed=0]
   * @param {number}  [trade.latencyMs=0] - execution latency
   * @param {string}  [trade.error='']
   */
  recordTrade(trade) {
    const entry = {
      id: this.trades.length + 1,
      timestamp: new Date().toISOString(),
      tokenPair: trade.tokenPair,
      buyFrom: trade.buyFrom,
      sellTo: trade.sellTo,
      spread: trade.spread,
      profit: trade.profit,
      success: !!trade.success,
      txHash: trade.txHash || '',
      usedFlashLoan: !!trade.usedFlashLoan,
      gasUsed: trade.gasUsed || 0,
      latencyMs: trade.latencyMs || 0,
      error: trade.error || '',
    };

    this.trades.push(entry);

    // Trim to max history
    if (this.trades.length > MAX_HISTORY) {
      this.trades = this.trades.slice(-MAX_HISTORY);
    }

    // Update per-DEX stats
    this._updateDexStat(entry.buyFrom, entry);
    this._updateDexStat(entry.sellTo, entry);

    // Auto-persist every 10 trades
    if (this.trades.length % 10 === 0) {
      this.save();
    }

    return entry;
  }

  /**
   * Get the last N trades.
   * @param {number} n
   * @returns {Object[]}
   */
  getRecentTrades(n = 20) {
    return this.trades.slice(-n);
  }

  /**
   * Get all recorded trades.
   */
  getAllTrades() {
    return [...this.trades];
  }

  // ──────────────────────────────────────────────
  //  DEX Performance Analysis
  // ──────────────────────────────────────────────

  /**
   * Update running stats for a single DEX.
   * @private
   */
  _updateDexStat(dexName, trade) {
    if (!this.dexStats[dexName]) {
      this.dexStats[dexName] = {
        trades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalLoss: 0,
        totalLatencyMs: 0,
        lastTradeAt: null,
        pairs: {},
      };
    }

    const s = this.dexStats[dexName];
    s.trades += 1;
    s.lastTradeAt = trade.timestamp;
    s.totalLatencyMs += trade.latencyMs;

    if (trade.success) {
      s.wins += 1;
      s.totalProfit += trade.profit;
    } else {
      s.losses += 1;
      s.totalLoss += Math.abs(trade.profit);
    }

    // Per-pair breakdown
    if (!s.pairs[trade.tokenPair]) {
      s.pairs[trade.tokenPair] = { trades: 0, wins: 0, totalProfit: 0 };
    }
    const ps = s.pairs[trade.tokenPair];
    ps.trades += 1;
    if (trade.success) {
      ps.wins += 1;
      ps.totalProfit += trade.profit;
    }
  }

  /**
   * Get performance report for a specific DEX.
   * @param {string} dexName
   * @returns {Object|null}
   */
  getDexPerformance(dexName) {
    const s = this.dexStats[dexName];
    if (!s) return null;

    return {
      dex: dexName,
      totalTrades: s.trades,
      wins: s.wins,
      losses: s.losses,
      winRate: s.trades > 0 ? (s.wins / s.trades) : 0,
      totalProfit: s.totalProfit,
      totalLoss: s.totalLoss,
      netProfit: s.totalProfit - s.totalLoss,
      avgProfitPerTrade: s.trades > 0 ? (s.totalProfit - s.totalLoss) / s.trades : 0,
      avgLatencyMs: s.trades > 0 ? s.totalLatencyMs / s.trades : 0,
      lastTradeAt: s.lastTradeAt,
      pairBreakdown: Object.entries(s.pairs).map(([pair, ps]) => ({
        pair,
        trades: ps.trades,
        wins: ps.wins,
        winRate: ps.trades > 0 ? ps.wins / ps.trades : 0,
        totalProfit: ps.totalProfit,
      })),
    };
  }

  /**
   * Get a ranked summary of all DEXes.
   * Sorted by net profit descending.
   * @returns {Object[]}
   */
  getDexRanking() {
    return Object.keys(this.dexStats)
      .map((dex) => this.getDexPerformance(dex))
      .sort((a, b) => b.netProfit - a.netProfit);
  }

  /**
   * Identify the best and worst performing DEXes.
   * @returns {{ best: Object|null, worst: Object|null }}
   */
  getDexInsights() {
    const ranking = this.getDexRanking();
    if (ranking.length === 0) return { best: null, worst: null };

    return {
      best: ranking[0],
      worst: ranking[ranking.length - 1],
    };
  }

  // ──────────────────────────────────────────────
  //  Aggregate Analytics
  // ──────────────────────────────────────────────

  /**
   * Get overall agent statistics.
   */
  getStats() {
    const total = this.trades.length;
    const wins = this.trades.filter((t) => t.success).length;
    const losses = total - wins;
    const totalProfit = this.trades
      .filter((t) => t.success)
      .reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = this.trades
      .filter((t) => !t.success)
      .reduce((sum, t) => sum + Math.abs(t.profit), 0);
    const flashLoanTrades = this.trades.filter((t) => t.usedFlashLoan).length;

    return {
      totalTrades: total,
      wins,
      losses,
      winRate: total > 0 ? wins / total : 0,
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      avgProfit: total > 0 ? (totalProfit - totalLoss) / total : 0,
      flashLoanTrades,
      activeDexes: Object.keys(this.dexStats).length,
    };
  }

  /**
   * Get hourly trade distribution (last 24 hours).
   */
  getHourlyDistribution() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const buckets = Array(24).fill(0);

    for (const t of this.trades) {
      const ts = new Date(t.timestamp).getTime();
      if (now - ts < oneDay) {
        const hour = new Date(ts).getHours();
        buckets[hour] += 1;
      }
    }
    return buckets;
  }

  /**
   * Get top trading pairs by volume.
   * @param {number} topN
   */
  getTopPairs(topN = 5) {
    const pairMap = {};
    for (const t of this.trades) {
      if (!pairMap[t.tokenPair]) {
        pairMap[t.tokenPair] = { pair: t.tokenPair, trades: 0, profit: 0 };
      }
      pairMap[t.tokenPair].trades += 1;
      pairMap[t.tokenPair].profit += t.success ? t.profit : -Math.abs(t.profit);
    }
    return Object.values(pairMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, topN);
  }

  // ──────────────────────────────────────────────
  //  Persistence
  // ──────────────────────────────────────────────

  _ensureDir() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  _load() {
    const tradesPath = path.join(this.memoryDir, TRADES_FILE);
    const statsPath = path.join(this.memoryDir, DEX_STATS_FILE);

    try {
      if (fs.existsSync(tradesPath)) {
        this.trades = JSON.parse(fs.readFileSync(tradesPath, 'utf8'));
      }
    } catch (e) {
      console.error('[AgentMemory] Failed to load trade history:', e.message);
    }

    try {
      if (fs.existsSync(statsPath)) {
        this.dexStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      }
    } catch (e) {
      console.error('[AgentMemory] Failed to load DEX stats:', e.message);
    }
  }

  /**
   * Persist all memory to disk.
   */
  save() {
    this._ensureDir();
    const tradesPath = path.join(this.memoryDir, TRADES_FILE);
    const statsPath = path.join(this.memoryDir, DEX_STATS_FILE);

    try {
      fs.writeFileSync(tradesPath, JSON.stringify(this.trades, null, 2), 'utf8');
      fs.writeFileSync(statsPath, JSON.stringify(this.dexStats, null, 2), 'utf8');
    } catch (e) {
      console.error('[AgentMemory] Failed to save memory:', e.message);
    }
  }

  /**
   * Clear all memory (for testing / reset).
   */
  clear() {
    this.trades = [];
    this.dexStats = {};
    this.save();
  }
}

module.exports = { AgentMemory };

/**
 * Trades API Routes
 * Trade history, execution, and PnL tracking
 */

const express = require('express');
const router = express.Router();

// In-memory trade store (replace with DB in production)
let trades = [];
let tradeCounter = 0;

/**
 * Generate a trade ID
 */
function nextTradeId() {
  tradeCounter += 1;
  return `TRD-${String(tradeCounter).padStart(6, '0')}`;
}

/**
 * GET /trades - List trades with filtering and pagination
 */
router.get('/', (req, res) => {
  const {
    strategy,
    status,
    pair,
    from,
    to,
    page = 1,
    limit = 50,
    sortBy = 'executedAt',
    sortOrder = 'desc',
  } = req.query;

  let result = [...trades];

  // Apply filters
  if (strategy) result = result.filter((t) => t.strategy === strategy);
  if (status) result = result.filter((t) => t.status === status);
  if (pair) result = result.filter((t) => t.pair === pair);
  if (from) result = result.filter((t) => t.executedAt >= from);
  if (to) result = result.filter((t) => t.executedAt <= to);

  // Sort
  result.sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
  });

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const start = (pageNum - 1) * pageSize;
  const paged = result.slice(start, start + pageSize);

  res.json({
    trades: paged,
    pagination: {
      page: pageNum,
      limit: pageSize,
      total: result.length,
      totalPages: Math.ceil(result.length / pageSize),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /trades/stats - Aggregate trade statistics
 */
router.get('/stats', (req, res) => {
  const { period = '24h' } = req.query;
  const now = Date.now();
  const periodMs = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
  const cutoff = now - (periodMs[period] || 86400000);

  const recentTrades = trades.filter((t) => new Date(t.executedAt).getTime() > cutoff);
  const successful = recentTrades.filter((t) => t.status === 'completed');
  const failed = recentTrades.filter((t) => t.status === 'failed');

  const totalProfit = successful.reduce((sum, t) => sum + parseFloat(t.netProfit || 0), 0);
  const totalGasCost = recentTrades.reduce((sum, t) => sum + parseFloat(t.gasCost || 0), 0);

  res.json({
    period,
    totalTrades: recentTrades.length,
    successful: successful.length,
    failed: failed.length,
    successRate: recentTrades.length > 0 ? ((successful.length / recentTrades.length) * 100).toFixed(2) + '%' : '0%',
    totalProfit: totalProfit.toFixed(6),
    totalGasCost: totalGasCost.toFixed(6),
    netProfit: (totalProfit - totalGasCost).toFixed(6),
    avgProfitPerTrade: successful.length > 0 ? (totalProfit / successful.length).toFixed(6) : '0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /trades/:id - Get trade by ID
 */
router.get('/:id', (req, res) => {
  const trade = trades.find((t) => t.id === req.params.id);
  if (!trade) {
    return res.status(404).json({ error: 'Not Found', message: `Trade ${req.params.id} not found` });
  }
  res.json({ trade, timestamp: new Date().toISOString() });
});

/**
 * POST /trades - Record a new trade (called internally by the engine)
 */
router.post('/', (req, res) => {
  const { strategy, pair, direction, amountIn, amountOut, gasCost, txHash, dex, path } = req.body;

  if (!strategy || !pair) {
    return res.status(400).json({ error: 'Bad Request', message: 'strategy and pair are required' });
  }

  const trade = {
    id: nextTradeId(),
    strategy,
    pair,
    direction: direction || 'buy',
    amountIn: amountIn || '0',
    amountOut: amountOut || '0',
    netProfit: req.body.netProfit || '0',
    profitBps: req.body.profitBps || 0,
    gasCost: gasCost || '0',
    txHash: txHash || null,
    dex: dex || 'unknown',
    path: path || [],
    status: 'pending',
    executedAt: new Date().toISOString(),
    confirmedAt: null,
    metadata: req.body.metadata || {},
  };

  trades.push(trade);
  res.status(201).json({ trade, timestamp: new Date().toISOString() });
});

/**
 * PATCH /trades/:id - Update trade status
 */
router.patch('/:id', (req, res) => {
  const trade = trades.find((t) => t.id === req.params.id);
  if (!trade) {
    return res.status(404).json({ error: 'Not Found', message: `Trade ${req.params.id} not found` });
  }

  const { status, txHash, amountOut, netProfit, gasCost } = req.body;
  if (status) trade.status = status;
  if (txHash) trade.txHash = txHash;
  if (amountOut) trade.amountOut = amountOut;
  if (netProfit) trade.netProfit = netProfit;
  if (gasCost) trade.gasCost = gasCost;
  if (status === 'completed' || status === 'failed') {
    trade.confirmedAt = new Date().toISOString();
  }

  res.json({ trade, timestamp: new Date().toISOString() });
});

/**
 * DELETE /trades/:id - Delete a trade record
 */
router.delete('/:id', (req, res) => {
  const idx = trades.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Trade ${req.params.id} not found` });
  }
  const [removed] = trades.splice(idx, 1);
  res.json({ message: `Trade ${removed.id} deleted`, id: removed.id });
});

module.exports = router;

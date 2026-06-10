/**
 * Backtesting API Routes
 * Strategy backtesting and historical simulation
 */

const express = require('express');
const router = express.Router();

const backtestResults = [];
let backtestCounter = 0;

/**
 * GET /backtesting - List all backtest runs
 */
router.get('/', (req, res) => {
  const { strategy, status, page = 1, limit = 20 } = req.query;
  let results = [...backtestResults];

  if (strategy) results = results.filter((b) => b.strategy === strategy);
  if (status) results = results.filter((b) => b.status === status);

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const start = (pageNum - 1) * pageSize;

  res.json({
    backtests: results.slice(start, start + pageSize),
    pagination: { page: pageNum, limit: pageSize, total: results.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /backtesting - Start a new backtest
 */
router.post('/', (req, res) => {
  const { strategy, startDate, endDate, initialCapital, config } = req.body;
  if (!strategy || !startDate || !endDate) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'strategy, startDate, and endDate are required',
    });
  }

  const backtest = {
    id: `BT-${String(++backtestCounter).padStart(6, '0')}`,
    strategy,
    startDate,
    endDate,
    initialCapital: initialCapital || '10000',
    config: config || {},
    status: 'running',
    progress: 0,
    results: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  backtestResults.push(backtest);

  // Simulate completion after a delay
  setTimeout(() => {
    backtest.status = 'completed';
    backtest.progress = 100;
    backtest.completedAt = new Date().toISOString();
    backtest.results = {
      totalTrades: Math.floor(Math.random() * 200),
      winRate: (Math.random() * 40 + 50).toFixed(2) + '%',
      totalReturn: (Math.random() * 30 - 5).toFixed(2) + '%',
      maxDrawdown: (Math.random() * 15 + 2).toFixed(2) + '%',
      sharpeRatio: (Math.random() * 2 + 0.5).toFixed(2),
      profitFactor: (Math.random() * 1.5 + 0.8).toFixed(2),
    };
  }, 3000);

  res.status(201).json({ backtest, timestamp: new Date().toISOString() });
});

/**
 * GET /backtesting/:id - Get backtest by ID
 */
router.get('/:id', (req, res) => {
  const backtest = backtestResults.find((b) => b.id === req.params.id);
  if (!backtest) {
    return res.status(404).json({ error: 'Not Found', message: `Backtest ${req.params.id} not found` });
  }
  res.json({ backtest, timestamp: new Date().toISOString() });
});

/**
 * DELETE /backtesting/:id - Delete a backtest result
 */
router.delete('/:id', (req, res) => {
  const idx = backtestResults.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Backtest ${req.params.id} not found` });
  }
  const [removed] = backtestResults.splice(idx, 1);
  res.json({ message: `Backtest ${removed.id} deleted`, id: removed.id });
});

/**
 * GET /backtesting/:id/trades - Get trades from a backtest
 */
router.get('/:id/trades', (req, res) => {
  const backtest = backtestResults.find((b) => b.id === req.params.id);
  if (!backtest) {
    return res.status(404).json({ error: 'Not Found', message: `Backtest ${req.params.id} not found` });
  }
  res.json({
    backtestId: backtest.id,
    trades: [],
    message: 'Detailed trade data available after backtest completion',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

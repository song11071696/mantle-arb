/**
 * Portfolio API Routes
 * Portfolio management, holdings, and allocation tracking
 */

const express = require('express');
const router = express.Router();

const portfolios = new Map();
let portfolioCounter = 0;

// Seed a default portfolio
portfolios.set('default', {
  id: 'PORT-000001',
  name: 'Default Portfolio',
  holdings: [
    { token: 'WETH', amount: '2.5', value: '8114.18', allocation: '45.2%' },
    { token: 'WMNT', amount: '5000', value: '5600.00', allocation: '31.2%' },
    { token: 'USDC', amount: '3000', value: '3000.30', allocation: '16.7%' },
    { token: 'WBTC', amount: '0.02', value: '1357.80', allocation: '6.9%' },
  ],
  totalValue: '18072.28',
  pnl: { amount: '1872.28', percent: '11.55%' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * GET /portfolio - List all portfolios
 */
router.get('/', (req, res) => {
  const result = Array.from(portfolios.values());
  res.json({
    portfolios: result,
    total: result.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /portfolio - Create a new portfolio
 */
router.post('/', (req, res) => {
  const { name, holdings } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Bad Request', message: 'name is required' });
  }

  const portfolio = {
    id: `PORT-${String(++portfolioCounter).padStart(6, '0')}`,
    name,
    holdings: holdings || [],
    totalValue: '0',
    pnl: { amount: '0', percent: '0%' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  portfolios.set(portfolio.id, portfolio);
  res.status(201).json({ portfolio, timestamp: new Date().toISOString() });
});

/**
 * GET /portfolio/:id - Get portfolio by ID
 */
router.get('/:id', (req, res) => {
  const portfolio = portfolios.get(req.params.id) ||
    Array.from(portfolios.values()).find((p) => p.id === req.params.id);

  if (!portfolio) {
    return res.status(404).json({ error: 'Not Found', message: `Portfolio ${req.params.id} not found` });
  }
  res.json({ portfolio, timestamp: new Date().toISOString() });
});

/**
 * PUT /portfolio/:id - Update portfolio
 */
router.put('/:id', (req, res) => {
  const portfolio = portfolios.get(req.params.id) ||
    Array.from(portfolios.values()).find((p) => p.id === req.params.id);

  if (!portfolio) {
    return res.status(404).json({ error: 'Not Found', message: `Portfolio ${req.params.id} not found` });
  }

  const { name, holdings } = req.body;
  if (name) portfolio.name = name;
  if (holdings) portfolio.holdings = holdings;
  portfolio.updatedAt = new Date().toISOString();

  res.json({ portfolio, timestamp: new Date().toISOString() });
});

/**
 * DELETE /portfolio/:id - Delete a portfolio
 */
router.delete('/:id', (req, res) => {
  if (!portfolios.has(req.params.id)) {
    return res.status(404).json({ error: 'Not Found', message: `Portfolio ${req.params.id} not found` });
  }
  portfolios.delete(req.params.id);
  res.json({ message: `Portfolio ${req.params.id} deleted`, id: req.params.id });
});

/**
 * GET /portfolio/:id/allocation - Get portfolio allocation breakdown
 */
router.get('/:id/allocation', (req, res) => {
  const portfolio = portfolios.get(req.params.id) ||
    Array.from(portfolios.values()).find((p) => p.id === req.params.id);

  if (!portfolio) {
    return res.status(404).json({ error: 'Not Found', message: `Portfolio ${req.params.id} not found` });
  }

  res.json({
    portfolioId: portfolio.id,
    allocation: portfolio.holdings,
    totalValue: portfolio.totalValue,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

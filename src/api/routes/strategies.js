/**
 * Strategies API Routes
 * CRUD operations for arbitrage strategy management
 */

const express = require('express');
const router = express.Router();

// In-memory strategy store (replace with DB in production)
let strategies = [
  {
    id: 'triangular-001',
    name: 'Triangular Arbitrage',
    type: 'triangular',
    enabled: true,
    config: { minProfitBps: 30, maxSlippageBps: 50 },
    pairs: ['WETH/USDC', 'USDC/USDT', 'WETH/USDT'],
    stats: { totalTrades: 0, successfulTrades: 0, totalProfit: '0' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cross-dex-001',
    name: 'Cross-DEX Arbitrage',
    type: 'cross-dex',
    enabled: true,
    config: { minProfitBps: 25, maxGasPrice: 50 },
    dexes: ['MerchantMoe', 'Agni', 'FusionX'],
    stats: { totalTrades: 0, successfulTrades: 0, totalProfit: '0' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'flash-loan-001',
    name: 'Flash Loan Arbitrage',
    type: 'flash-loan',
    enabled: false,
    config: { minProfitBps: 50, maxLoanAmount: '10000' },
    stats: { totalTrades: 0, successfulTrades: 0, totalProfit: '0' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * GET /strategies - List all strategies
 */
router.get('/', (req, res) => {
  const { type, enabled } = req.query;
  let result = [...strategies];

  if (type) result = result.filter((s) => s.type === type);
  if (enabled !== undefined) result = result.filter((s) => s.enabled === (enabled === 'true'));

  res.json({
    strategies: result,
    total: result.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /strategies/:id - Get strategy by ID
 */
router.get('/:id', (req, res) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }
  res.json({ strategy, timestamp: new Date().toISOString() });
});

/**
 * POST /strategies - Create a new strategy
 */
router.post('/', (req, res) => {
  const { name, type, config, pairs, dexes } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Bad Request', message: 'name and type are required' });
  }

  const validTypes = ['triangular', 'cross-dex', 'flash-loan', 'statistical'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Bad Request', message: `type must be one of: ${validTypes.join(', ')}` });
  }

  const strategy = {
    id: `${type}-${Date.now()}`,
    name,
    type,
    enabled: false,
    config: config || {},
    pairs: pairs || [],
    dexes: dexes || [],
    stats: { totalTrades: 0, successfulTrades: 0, totalProfit: '0' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  strategies.push(strategy);
  res.status(201).json({ strategy, timestamp: new Date().toISOString() });
});

/**
 * PUT /strategies/:id - Update a strategy
 */
router.put('/:id', (req, res) => {
  const idx = strategies.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }

  const updates = req.body;
  strategies[idx] = {
    ...strategies[idx],
    ...updates,
    id: strategies[idx].id, // prevent ID change
    updatedAt: new Date().toISOString(),
  };

  res.json({ strategy: strategies[idx], timestamp: new Date().toISOString() });
});

/**
 * POST /strategies/:id/enable - Enable a strategy
 */
router.post('/:id/enable', (req, res) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }
  strategy.enabled = true;
  strategy.updatedAt = new Date().toISOString();
  res.json({ message: `Strategy ${strategy.name} enabled`, strategy });
});

/**
 * POST /strategies/:id/disable - Disable a strategy
 */
router.post('/:id/disable', (req, res) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }
  strategy.enabled = false;
  strategy.updatedAt = new Date().toISOString();
  res.json({ message: `Strategy ${strategy.name} disabled`, strategy });
});

/**
 * DELETE /strategies/:id - Delete a strategy
 */
router.delete('/:id', (req, res) => {
  const idx = strategies.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }
  const [removed] = strategies.splice(idx, 1);
  res.json({ message: `Strategy ${removed.name} deleted`, id: removed.id });
});

/**
 * GET /strategies/:id/stats - Get strategy performance stats
 */
router.get('/:id/stats', (req, res) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Not Found', message: `Strategy ${req.params.id} not found` });
  }
  res.json({
    id: strategy.id,
    name: strategy.name,
    stats: strategy.stats,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

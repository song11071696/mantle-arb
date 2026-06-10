/**
 * Risk API Routes
 * Risk management, exposure tracking, and limits
 */

const express = require('express');
const router = express.Router();

const riskLimits = {
  maxPositionSize: '10000',
  maxExposurePerPair: '5000',
  maxDailyLoss: '500',
  maxDrawdownPercent: '10',
  maxSlippageBps: 100,
  maxGasPriceGwei: 100,
  emergencyStopEnabled: false,
};

const riskEvents = [];
let eventCounter = 0;

/**
 * GET /risk - Get current risk status overview
 */
router.get('/', (req, res) => {
  res.json({
    limits: riskLimits,
    currentExposure: {
      total: '0',
      byPair: {},
      byDex: {},
    },
    riskScore: 'low',
    emergencyStop: riskLimits.emergencyStopEnabled,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /risk/limits - Get risk limits
 */
router.get('/limits', (req, res) => {
  res.json({ limits: riskLimits, timestamp: new Date().toISOString() });
});

/**
 * PUT /risk/limits - Update risk limits
 */
router.put('/limits', (req, res) => {
  const updates = req.body;
  const allowedFields = Object.keys(riskLimits);

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      riskLimits[key] = value;
    }
  }

  res.json({ limits: riskLimits, message: 'Risk limits updated', timestamp: new Date().toISOString() });
});

/**
 * GET /risk/exposure - Get current exposure details
 */
router.get('/exposure', (req, res) => {
  res.json({
    totalExposure: '0',
    byPair: {},
    byDex: {},
    byStrategy: {},
    utilizationPercent: '0%',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /risk/emergency-stop - Toggle emergency stop
 */
router.post('/emergency-stop', (req, res) => {
  const { enabled } = req.body;
  riskLimits.emergencyStopEnabled = enabled !== undefined ? enabled : !riskLimits.emergencyStopEnabled;

  const event = {
    id: `RE-${String(++eventCounter).padStart(6, '0')}`,
    type: 'emergency-stop',
    action: riskLimits.emergencyStopEnabled ? 'activated' : 'deactivated',
    triggeredBy: req.user?.name || 'system',
    createdAt: new Date().toISOString(),
  };
  riskEvents.push(event);

  res.json({
    emergencyStop: riskLimits.emergencyStopEnabled,
    event,
    message: `Emergency stop ${riskLimits.emergencyStopEnabled ? 'activated' : 'deactivated'}`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /risk/events - Get risk events history
 */
router.get('/events', (req, res) => {
  const { type, limit = 50 } = req.query;
  let events = [...riskEvents];

  if (type) events = events.filter((e) => e.type === type);
  events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  events = events.slice(0, parseInt(limit));

  res.json({
    events,
    total: riskEvents.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /risk/check - Pre-trade risk check
 */
router.post('/check', (req, res) => {
  const { pair, amount, strategy, dex } = req.body;

  if (!pair || !amount) {
    return res.status(400).json({ error: 'Bad Request', message: 'pair and amount are required' });
  }

  const amountNum = parseFloat(amount);
  const maxSize = parseFloat(riskLimits.maxPositionSize);
  const approved = amountNum <= maxSize && !riskLimits.emergencyStopEnabled;

  res.json({
    approved,
    pair,
    amount,
    checks: {
      positionSize: amountNum <= maxSize,
      emergencyStop: !riskLimits.emergencyStopEnabled,
    },
    reason: approved ? 'All checks passed' : 'Risk limit exceeded',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

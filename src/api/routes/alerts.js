/**
 * Alerts API Routes
 * Alert rules management and notification delivery
 */

const express = require('express');
const router = express.Router();

const alertRules = [];
const alertHistory = [];
let ruleCounter = 0;

/**
 * GET /alerts - List alert rules
 */
router.get('/', (req, res) => {
  const { type, enabled, page = 1, limit = 20 } = req.query;
  let rules = [...alertRules];

  if (type) rules = rules.filter((r) => r.type === type);
  if (enabled !== undefined) rules = rules.filter((r) => r.enabled === (enabled === 'true'));

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const start = (pageNum - 1) * pageSize;

  res.json({
    rules: rules.slice(start, start + pageSize),
    pagination: { page: pageNum, limit: pageSize, total: rules.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /alerts - Create a new alert rule
 */
router.post('/', (req, res) => {
  const { name, type, condition, channels, enabled } = req.body;
  if (!name || !type || !condition) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'name, type, and condition are required',
    });
  }

  const validTypes = ['price', 'spread', 'profit', 'loss', 'gas', 'liquidity', 'error'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `type must be one of: ${validTypes.join(', ')}`,
    });
  }

  const rule = {
    id: `AR-${String(++ruleCounter).padStart(6, '0')}`,
    name,
    type,
    condition,
    channels: channels || ['webhook'],
    enabled: enabled !== false,
    triggerCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date().toISOString(),
  };

  alertRules.push(rule);
  res.status(201).json({ rule, timestamp: new Date().toISOString() });
});

/**
 * GET /alerts/history - Get alert trigger history
 */
router.get('/history', (req, res) => {
  const { ruleId, limit = 50 } = req.query;
  let history = [...alertHistory];

  if (ruleId) history = history.filter((h) => h.ruleId === ruleId);
  history.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
  history = history.slice(0, parseInt(limit));

  res.json({
    history,
    total: alertHistory.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /alerts/:id - Get alert rule by ID
 */
router.get('/:id', (req, res) => {
  const rule = alertRules.find((r) => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Not Found', message: `Alert rule ${req.params.id} not found` });
  }
  res.json({ rule, timestamp: new Date().toISOString() });
});

/**
 * PUT /alerts/:id - Update an alert rule
 */
router.put('/:id', (req, res) => {
  const idx = alertRules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Alert rule ${req.params.id} not found` });
  }

  const updates = req.body;
  alertRules[idx] = { ...alertRules[idx], ...updates, id: alertRules[idx].id, updatedAt: new Date().toISOString() };
  res.json({ rule: alertRules[idx], timestamp: new Date().toISOString() });
});

/**
 * DELETE /alerts/:id - Delete an alert rule
 */
router.delete('/:id', (req, res) => {
  const idx = alertRules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Alert rule ${req.params.id} not found` });
  }
  const [removed] = alertRules.splice(idx, 1);
  res.json({ message: `Alert rule ${removed.name} deleted`, id: removed.id });
});

module.exports = router;

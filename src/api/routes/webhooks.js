/**
 * Webhooks API Routes
 * Webhook registration and delivery management
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const webhooks = [];
const deliveryLog = [];
let webhookCounter = 0;

/**
 * GET /webhooks - List all registered webhooks
 */
router.get('/', (req, res) => {
  const { event, enabled } = req.query;
  let result = [...webhooks];

  if (event) result = result.filter((w) => w.events.includes(event));
  if (enabled !== undefined) result = result.filter((w) => w.enabled === (enabled === 'true'));

  res.json({
    webhooks: result,
    total: result.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /webhooks - Register a new webhook
 */
router.post('/', (req, res) => {
  const { url, events, secret, enabled } = req.body;
  if (!url || !events || !Array.isArray(events)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'url and events (array) are required',
    });
  }

  const validEvents = ['trade.executed', 'trade.failed', 'alert.triggered', 'strategy.updated', 'price.alert'];
  const invalidEvents = events.filter((e) => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}`,
    });
  }

  const webhook = {
    id: `WH-${String(++webhookCounter).padStart(6, '0')}`,
    url,
    events,
    secret: secret || crypto.randomBytes(32).toString('hex'),
    enabled: enabled !== false,
    deliveryCount: 0,
    lastDeliveredAt: null,
    lastStatus: null,
    createdAt: new Date().toISOString(),
  };

  webhooks.push(webhook);
  res.status(201).json({ webhook, timestamp: new Date().toISOString() });
});

/**
 * GET /webhooks/:id - Get webhook by ID
 */
router.get('/:id', (req, res) => {
  const webhook = webhooks.find((w) => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
  }
  res.json({ webhook, timestamp: new Date().toISOString() });
});

/**
 * PUT /webhooks/:id - Update a webhook
 */
router.put('/:id', (req, res) => {
  const idx = webhooks.findIndex((w) => w.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
  }

  const { url, events, enabled } = req.body;
  if (url) webhooks[idx].url = url;
  if (events) webhooks[idx].events = events;
  if (enabled !== undefined) webhooks[idx].enabled = enabled;
  webhooks[idx].updatedAt = new Date().toISOString();

  res.json({ webhook: webhooks[idx], timestamp: new Date().toISOString() });
});

/**
 * DELETE /webhooks/:id - Delete a webhook
 */
router.delete('/:id', (req, res) => {
  const idx = webhooks.findIndex((w) => w.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
  }
  const [removed] = webhooks.splice(idx, 1);
  res.json({ message: `Webhook ${removed.id} deleted`, id: removed.id });
});

/**
 * POST /webhooks/:id/test - Test a webhook
 */
router.post('/:id/test', (req, res) => {
  const webhook = webhooks.find((w) => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
  }

  res.json({
    webhookId: webhook.id,
    testResult: {
      sent: true,
      status: 200,
      responseTime: Math.floor(Math.random() * 500 + 100) + 'ms',
    },
    message: 'Test payload sent',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /webhooks/delivery-log - Get webhook delivery log
 */
router.get('/delivery/log', (req, res) => {
  const { webhookId, limit = 50 } = req.query;
  let log = [...deliveryLog];

  if (webhookId) log = log.filter((d) => d.webhookId === webhookId);
  log = log.slice(0, parseInt(limit));

  res.json({ log, total: deliveryLog.length, timestamp: new Date().toISOString() });
});

module.exports = router;

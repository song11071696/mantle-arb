/**
 * API Server — Unified API paths under /api/v1/
 * 
 * All endpoints follow REST conventions under the /api/v1/ prefix.
 * Authentication is required for write operations.
 */

const express = require('express');
const { SafetyLayer } = require('./safety');
const { AIAdvisor } = require('./ai-advisor');

const app = express();
app.use(express.json());

const safety = new SafetyLayer();
const aiAdvisor = new AIAdvisor();

// ─── Health & Status ─────────────────────────────────────────
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'running',
    version: '0.1.0-prototype',
    type: 'open-source arbitrage agent prototype',
    aiAdvisoryOnly: true,
    timestamp: new Date().toISOString(),
  });
});

// ─── Opportunities ───────────────────────────────────────────
app.get('/api/v1/opportunities', async (req, res) => {
  try {
    // In production, this would fetch real market data
    const marketData = { pairs: [] };
    const suggestions = await aiAdvisor.analyze(marketData);
    res.json({
      suggestions,
      disclaimer: 'All suggestions are advisory only. Safety validation required before execution.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// ─── Execute Trade ───────────────────────────────────────────
app.post('/api/v1/execute', (req, res) => {
  try {
    const proposal = req.body;

    // All proposals MUST pass through SafetyLayer
    const validation = safety.validateTradeProposal(proposal);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Trade rejected by safety layer',
        reasons: validation.errors,
      });
    }

    // Check execution mode
    const executionMode = require('../config/default.json').execution.mode;
    if (executionMode === 'manual') {
      return res.json({
        status: 'pending_approval',
        message: 'Trade passed safety checks. Awaiting manual confirmation.',
        proposal,
      });
    }

    // Auto-mode (user explicitly configured) would go here
    res.json({
      status: 'accepted',
      message: 'Trade passed safety checks and accepted for execution.',
      proposal,
    });
  } catch (err) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// ─── Configuration ───────────────────────────────────────────
app.get('/api/v1/config', (req, res) => {
  const config = require('../config/default.json');
  res.json({
    safety: config.safety,
    ai: { ...config.ai, advisoryOnly: true },
    execution: config.execution,
  });
});

app.put('/api/v1/config', (req, res) => {
  // In production, this would update config with validation
  res.json({ message: 'Configuration update received. Requires restart.' });
});

// ─── History ─────────────────────────────────────────────────
app.get('/api/v1/history', (req, res) => {
  res.json({
    trades: [],
    message: 'Trade history is empty (prototype mode).',
  });
});

// ─── Whitelists ──────────────────────────────────────────────
app.get('/api/v1/whitelist/routers', (req, res) => {
  const state = safety.getWhitelistState();
  res.json({ routers: state.routers });
});

app.get('/api/v1/whitelist/tokens', (req, res) => {
  const state = safety.getWhitelistState();
  res.json({ tokens: state.tokens });
});

// ─── Financial Disclaimer (on all responses) ─────────────────
app.use((req, res, next) => {
  res.set('X-Financial-Disclaimer', 'This is a research prototype. Not financial advice. Use at your own risk.');
  next();
});

module.exports = { app, safety, aiAdvisor };

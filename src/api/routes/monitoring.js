/**
 * Monitoring API Routes
 * System health, metrics, alerts, and real-time status
 */

const express = require('express');
const router = express.Router();

// In-memory monitoring state
const systemState = {
  startTime: new Date().toISOString(),
  status: 'running',
  components: {
    priceMonitor: { status: 'idle', trackedPairs: 0, lastUpdate: null },
    tradeMonitor: { status: 'idle', activeTrades: 0, lastUpdate: null },
    strategyEngine: { status: 'idle', activeStrategies: 0, lastUpdate: null },
    alertManager: { status: 'idle', activeRules: 0, lastUpdate: null },
  },
};

const alerts = [];
const metricsHistory = [];
let alertCounter = 0;

/**
 * GET /monitoring/status - Overall system status
 */
router.get('/status', (req, res) => {
  const uptime = Date.now() - new Date(systemState.startTime).getTime();
  res.json({
    status: systemState.status,
    uptime: {
      ms: uptime,
      human: formatUptime(uptime),
    },
    components: systemState.components,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /monitoring/health - Health check with component details
 */
router.get('/health', (req, res) => {
  const checks = {};
  let overallHealthy = true;

  for (const [name, comp] of Object.entries(systemState.components)) {
    const isHealthy = comp.status !== 'error';
    checks[name] = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      lastUpdate: comp.lastUpdate,
    };
    if (!isHealthy) overallHealthy = false;
  }

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json({
    healthy: overallHealthy,
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /monitoring/metrics - Current system metrics
 */
router.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    system: {
      uptime: process.uptime(),
      memory: {
        rss: formatBytes(memUsage.rss),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        external: formatBytes(memUsage.external),
      },
      cpuUsage: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
    },
    components: systemState.components,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /monitoring/metrics/history - Historical metrics for charting
 */
router.get('/metrics/history', (req, res) => {
  const { limit = 100 } = req.query;
  const recent = metricsHistory.slice(-parseInt(limit));
  res.json({
    metrics: recent,
    total: metricsHistory.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /monitoring/metrics - Record a metrics snapshot
 */
router.post('/metrics', (req, res) => {
  const snapshot = {
    ...req.body,
    recordedAt: new Date().toISOString(),
  };
  metricsHistory.push(snapshot);

  // Keep only last 1000 entries
  if (metricsHistory.length > 1000) {
    metricsHistory.splice(0, metricsHistory.length - 1000);
  }

  res.status(201).json({ message: 'Metrics recorded', timestamp: new Date().toISOString() });
});

/**
 * GET /monitoring/alerts - List alerts
 */
router.get('/alerts', (req, res) => {
  const { severity, acknowledged, limit = 50 } = req.query;
  let result = [...alerts];

  if (severity) result = result.filter((a) => a.severity === severity);
  if (acknowledged !== undefined) result = result.filter((a) => a.acknowledged === (acknowledged === 'true'));

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  result = result.slice(0, parseInt(limit));

  res.json({
    alerts: result,
    total: alerts.length,
    unacknowledged: alerts.filter((a) => !a.acknowledged).length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /monitoring/alerts - Create an alert
 */
router.post('/alerts', (req, res) => {
  const { severity = 'info', title, message, source, metadata } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Bad Request', message: 'title and message are required' });
  }

  const alert = {
    id: `ALT-${String(++alertCounter).padStart(6, '0')}`,
    severity,
    title,
    message,
    source: source || 'system',
    acknowledged: false,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  alerts.push(alert);

  // Keep only last 500 alerts
  if (alerts.length > 500) {
    alerts.splice(0, alerts.length - 500);
  }

  res.status(201).json({ alert, timestamp: new Date().toISOString() });
});

/**
 * PATCH /monitoring/alerts/:id/acknowledge - Acknowledge an alert
 */
router.patch('/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find((a) => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Not Found', message: `Alert ${req.params.id} not found` });
  }
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  res.json({ alert, timestamp: new Date().toISOString() });
});

/**
 * PUT /monitoring/components/:name - Update component status
 */
router.put('/components/:name', (req, res) => {
  const { name } = req.params;
  if (!systemState.components[name]) {
    systemState.components[name] = { status: 'unknown' };
  }
  Object.assign(systemState.components[name], req.body, { lastUpdate: new Date().toISOString() });
  res.json({ component: name, status: systemState.components[name], timestamp: new Date().toISOString() });
});

// Helper functions
function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m ${s % 60}s`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

module.exports = router;

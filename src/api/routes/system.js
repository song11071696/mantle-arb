/**
 * System API Routes
 * System configuration, maintenance, and administration
 */

const express = require('express');
const router = express.Router();

const systemConfig = {
  network: {
    chainId: 5000,
    rpcUrl: process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz',
    explorerUrl: 'https://mantlescan.xyz',
  },
  trading: {
    enabled: true,
    dryRun: true,
    maxConcurrentTrades: 5,
    defaultSlippageBps: 50,
    gasLimit: 500000,
  },
  monitoring: {
    priceUpdateInterval: 5000,
    healthCheckInterval: 30000,
    metricsRetention: 86400000,
  },
};

/**
 * GET /system/config - Get system configuration
 */
router.get('/config', (req, res) => {
  // Mask sensitive values
  const config = JSON.parse(JSON.stringify(systemConfig));
  if (config.network.rpcUrl) {
    config.network.rpcUrl = config.network.rpcUrl.replace(/\/\/[^@]+@/, '//***@');
  }
  res.json({ config, timestamp: new Date().toISOString() });
});

/**
 * PUT /system/config - Update system configuration
 */
router.put('/config', (req, res) => {
  const updates = req.body;

  if (updates.network) Object.assign(systemConfig.network, updates.network);
  if (updates.trading) Object.assign(systemConfig.trading, updates.trading);
  if (updates.monitoring) Object.assign(systemConfig.monitoring, updates.monitoring);

  res.json({
    config: systemConfig,
    message: 'Configuration updated',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /system/info - Get system information
 */
router.get('/info', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    name: 'MantleArb',
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    },
    network: {
      chainId: systemConfig.network.chainId,
      networkName: 'Mantle',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /system/maintenance - Toggle maintenance mode
 */
router.post('/maintenance', (req, res) => {
  const { enabled, reason } = req.body;
  systemConfig.trading.enabled = !enabled;

  res.json({
    maintenance: enabled,
    reason: reason || 'Manual maintenance',
    tradingEnabled: systemConfig.trading.enabled,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /system/restart - Request system restart
 */
router.post('/restart', (req, res) => {
  res.json({
    message: 'Restart scheduled',
    estimatedDowntime: '5-10 seconds',
    timestamp: new Date().toISOString(),
  });

  // Delayed restart
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

/**
 * GET /system/logs - Get recent system logs
 */
router.get('/logs', (req, res) => {
  const { level = 'info', limit = 100 } = req.query;
  res.json({
    logs: [],
    level,
    message: 'Log retrieval requires persistent log storage configuration',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

/**
 * Dashboard API Routes
 * Aggregated dashboard data and widget endpoints
 */

const express = require('express');
const router = express.Router();

/**
 * GET /dashboard - Get full dashboard summary
 */
router.get('/', (req, res) => {
  res.json({
    summary: {
      totalBalance: '18072.28',
      dailyPnL: '0.00',
      dailyPnLPercent: '0%',
      activeStrategies: 0,
      openPositions: 0,
      totalTrades24h: 0,
      successRate: '0%',
    },
    quickStats: {
      uptime: process.uptime(),
      activeAlerts: 0,
      pendingWebhooks: 0,
      systemHealth: 'healthy',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /dashboard/activity - Get recent activity feed
 */
router.get('/activity', (req, res) => {
  const { limit = 20, type } = req.query;

  res.json({
    activities: [],
    total: 0,
    filters: { type: type || 'all' },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /dashboard/charts - Get chart data for dashboard widgets
 */
router.get('/charts', (req, res) => {
  const { type = 'pnl', period = '7d' } = req.query;

  const validTypes = ['pnl', 'trades', 'gas', 'volume'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `type must be one of: ${validTypes.join(', ')}`,
    });
  }

  const now = Date.now();
  const points = [];
  const intervals = { '24h': 3600000, '7d': 86400000, '30d': 86400000 };
  const interval = intervals[period] || 86400000;
  const periods = { '24h': 24, '7d': 7, '30d': 30 };
  const count = periods[period] || 7;

  for (let i = count; i >= 0; i--) {
    points.push({
      timestamp: new Date(now - i * interval).toISOString(),
      value: '0.00',
    });
  }

  res.json({
    chartType: type,
    period,
    data: points,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /dashboard/notifications - Get dashboard notifications
 */
router.get('/notifications', (req, res) => {
  const { unread, limit = 20 } = req.query;

  res.json({
    notifications: [],
    unreadCount: 0,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /dashboard/notifications/read - Mark notifications as read
 */
router.post('/notifications/read', (req, res) => {
  const { ids } = req.body;

  res.json({
    markedRead: ids ? ids.length : 0,
    message: 'Notifications marked as read',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /dashboard/widgets - Get dashboard widget configuration
 */
router.get('/widgets', (req, res) => {
  res.json({
    widgets: [
      { id: 'summary', type: 'summary', position: { row: 0, col: 0 }, size: 'large' },
      { id: 'pnl-chart', type: 'chart', position: { row: 1, col: 0 }, size: 'large' },
      { id: 'active-strategies', type: 'list', position: { row: 0, col: 1 }, size: 'medium' },
      { id: 'recent-trades', type: 'table', position: { row: 1, col: 1 }, size: 'medium' },
      { id: 'alerts', type: 'alerts', position: { row: 2, col: 0 }, size: 'small' },
      { id: 'system-health', type: 'status', position: { row: 2, col: 1 }, size: 'small' },
    ],
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

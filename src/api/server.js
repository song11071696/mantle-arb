/**
 * MantleArb API Server
 * Express-based REST API for the MantleArb arbitrage platform
 * Provides endpoints for strategies, trades, monitoring, backtesting, AI, and admin
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { authMiddleware } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { validator } = require('./middleware/validator');

const strategiesRouter = require('./routes/strategies');
const tradesRouter = require('./routes/trades');
const monitoringRouter = require('./routes/monitoring');
const backtestingRouter = require('./routes/backtesting');
const aiRouter = require('./routes/ai');
const usersRouter = require('./routes/users');
const alertsRouter = require('./routes/alerts');
const pricesRouter = require('./routes/prices');
const portfolioRouter = require('./routes/portfolio');
const analyticsRouter = require('./routes/analytics');
const riskRouter = require('./routes/risk');
const systemRouter = require('./routes/system');
const webhooksRouter = require('./routes/webhooks');
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const contractRouter = require('./routes/contract');

const { createWebSocketServer } = require('../websocket/server');
const { initializeDatabase } = require('../database/connection');
const { logger } = require('../utils/logger');

class MantleArbServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || process.env.API_PORT || 3001,
      host: config.host || process.env.API_HOST || '0.0.0.0',
      corsOrigins: config.corsOrigins || process.env.CORS_ORIGINS || '*',
      enableAuth: config.enableAuth !== false,
      enableRateLimit: config.enableRateLimit !== false,
      ...config,
    };

    this.app = express();
    this.server = http.createServer(this.app);
    this.wsServer = null;
    this.isRunning = false;

    this._setupMiddleware();
    this._setupRoutes();
    this._setupErrorHandling();
  }

  _setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins === '*' ? '*' : this.config.corsOrigins.split(','),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: true,
      maxAge: 86400,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    if (this.config.enableRateLimit) {
      this.app.use('/api/', rateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 100,
      }));
    }

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  _setupRoutes() {
    // Health check (no auth required)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'MantleArb API',
        version: 'v1',
        description: 'AI-Powered DEX Arbitrage Agent on Mantle Network',
        endpoints: {
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          strategies: '/api/v1/strategies',
          trades: '/api/v1/trades',
          monitoring: '/api/v1/monitoring',
          backtesting: '/api/v1/backtesting',
          ai: '/api/v1/ai',
          alerts: '/api/v1/alerts',
          prices: '/api/v1/prices',
          portfolio: '/api/v1/portfolio',
          analytics: '/api/v1/analytics',
          risk: '/api/v1/risk',
          system: '/api/v1/system',
          webhooks: '/api/v1/webhooks',
          contract: '/api/v1/contract',
          dashboard: '/api/v1/dashboard',
        },
      });
    });

    // Public routes (no auth)
    this.app.use('/api/v1/auth', authRouter);

    // Protected routes (auth required)
    if (this.config.enableAuth) {
      this.app.use('/api/v1/', authMiddleware);
    }

    // API v1 routes
    this.app.use('/api/v1/strategies', strategiesRouter);
    this.app.use('/api/v1/trades', tradesRouter);
    this.app.use('/api/v1/monitoring', monitoringRouter);
    this.app.use('/api/v1/backtesting', backtestingRouter);
    this.app.use('/api/v1/ai', aiRouter);
    this.app.use('/api/v1/users', usersRouter);
    this.app.use('/api/v1/alerts', alertsRouter);
    this.app.use('/api/v1/prices', pricesRouter);
    this.app.use('/api/v1/portfolio', portfolioRouter);
    this.app.use('/api/v1/analytics', analyticsRouter);
    this.app.use('/api/v1/risk', riskRouter);
    this.app.use('/api/v1/system', systemRouter);
    this.app.use('/api/v1/webhooks', webhooksRouter);
    this.app.use('/api/v1/contract', contractRouter);
    this.app.use('/api/v1/dashboard', dashboardRouter);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  _setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized');

      // Initialize WebSocket server
      this.wsServer = createWebSocketServer(this.server);
      logger.info('WebSocket server initialized');

      // Start HTTP server
      await new Promise((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, () => {
          this.isRunning = true;
          logger.info(`MantleArb API Server running on ${this.config.host}:${this.config.port}`);
          resolve();
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            logger.error(`Port ${this.config.port} is already in use`);
            reject(err);
          } else {
            reject(err);
          }
        });
      });

      return {
        port: this.config.port,
        host: this.config.host,
        wsPort: this.config.port,
      };
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.wsServer) {
        this.wsServer.close();
      }

      await new Promise((resolve) => {
        this.server.close(() => {
          this.isRunning = false;
          logger.info('Server stopped');
          resolve();
        });
      });
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }

  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }
}

// Auto-start if run directly
if (require.main === module) {
  const server = new MantleArbServer();
  server.start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = { MantleArbServer };

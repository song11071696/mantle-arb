/**
 * Request Logger Middleware
 * Logs incoming requests with timing, status, and metadata
 */

const crypto = require('crypto');

// Log level thresholds
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || 1;

/**
 * Format request duration in human-readable form
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format log entry as structured JSON
 */
function formatLogEntry(entry) {
  return JSON.stringify(entry);
}

/**
 * Sanitize request body for logging (remove sensitive fields)
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'authorization'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '***REDACTED***';
  }
  return sanitized;
}

/**
 * Main request logger middleware
 * Attaches a unique request ID and logs request/response details
 */
function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const startTime = Date.now();

  // Attach request ID to request and response
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Capture original res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const entry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: formatDuration(duration),
      durationMs: duration,
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: req.user?.id || req.user?.name || null,
      contentLength: res.getHeader('content-length') || 0,
      timestamp: new Date().toISOString(),
    };

    if (req.method !== 'GET' && req.body && currentLevel <= 0) {
      entry.requestBody = sanitizeBody(req.body);
    }

    const entryLevel = LOG_LEVELS[entry.level] || 1;
    if (entryLevel >= currentLevel) {
      const output = formatLogEntry(entry);
      if (entry.level === 'error') {
        console.error(output);
      } else if (entry.level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    }

    originalEnd.apply(res, args);
  };

  next();
}

module.exports = { requestLogger };

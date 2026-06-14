/**
 * Rate Limiting Middleware
 * Sliding-window rate limiter with per-IP and per-user tracking
 */

// In-memory store for rate limit counters
const requestLog = new Map();

// Default configuration
const DEFAULT_CONFIG = {
  windowMs: 60 * 1000,       // 1 minute window
  maxRequests: 100,           // max requests per window
  keyGenerator: null,         // custom key function
  skipSuccessfulRequests: false,
  message: 'Too many requests, please try again later.',
};

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(windowMs) {
  const now = Date.now();
  for (const [key, entry] of requestLog) {
    if (now - entry.windowStart > windowMs * 2) {
      requestLog.delete(key);
    }
  }
}

/**
 * Get the client identifier from the request
 */
function getClientKey(req) {
  return req.user?.id || req.user?.name || req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Create a rate limiter middleware with the given configuration
 * @param {Object} config - Rate limit configuration
 * @returns {Function} Express middleware
 */
function rateLimiter(config = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const keyFn = opts.keyGenerator || getClientKey;

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(() => {
    cleanupExpiredEntries(opts.windowMs);
  }, 5 * 60 * 1000);
  cleanupInterval.unref();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();

    let entry = requestLog.get(key);
    if (!entry || now - entry.windowStart > opts.windowMs) {
      entry = { windowStart: now, count: 0 };
      requestLog.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, opts.maxRequests - entry.count);
    const resetTime = entry.windowStart + opts.windowMs;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(opts.maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    if (entry.count > opts.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: opts.message,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Create a strict rate limiter for sensitive endpoints (login, trade execution)
 */
function strictRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many requests to sensitive endpoint.',
  });
}

/**
 * Create a lenient rate limiter for read-heavy endpoints
 */
function lenientRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    message: 'Rate limit exceeded for read endpoint.',
  });
}

/**
 * Get current rate limit stats for monitoring
 */
function getStats() {
  return {
    activeKeys: requestLog.size,
    entries: Array.from(requestLog.entries()).slice(0, 50).map(([key, entry]) => ({
      key,
      count: entry.count,
      windowStart: new Date(entry.windowStart).toISOString(),
    })),
  };
}

module.exports = {
  rateLimiter,
  strictRateLimiter,
  lenientRateLimiter,
  getStats,
  DEFAULT_CONFIG,
};

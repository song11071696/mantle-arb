/**
 * AsyncThrottler - Token bucket rate limiter for API calls
 * (inspired by Hummingbot's AsyncThrottler)
 *
 * Features:
 * - Token bucket algorithm with configurable rate and burst
 * - Multi-endpoint support with independent limits
 * - Automatic retry with exponential backoff
 * - Queue-based: excess requests wait rather than fail
 */

const { Logger } = require('../utils/logger');

class TokenBucket {
  constructor({ capacity, refillRate, refillIntervalMs = 1000 }) {
    this.capacity = capacity;       // max tokens
    this.tokens = capacity;         // current tokens
    this.refillRate = refillRate;   // tokens added per interval
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const refillCount = Math.floor(elapsed / this.refillIntervalMs) * this.refillRate;
    if (refillCount > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refillCount);
      this.lastRefillTime = now;
    }
  }

  /**
   * Try to consume one token
   * @returns {boolean} true if consumed, false if no tokens available
   */
  tryConsume() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Calculate wait time (ms) until a token is available
   */
  waitTimeMs() {
    this.refill();
    if (this.tokens >= 1) return 0;
    const deficit = 1 - this.tokens;
    return Math.ceil((deficit / this.refillRate) * this.refillIntervalMs);
  }
}

/**
 * Endpoint configuration
 */
const DEFAULT_ENDPOINT_CONFIG = {
  capacity: 10,              // max burst
  refillRate: 5,             // tokens per interval
  refillIntervalMs: 1000,    // refill interval
};

/**
 * AsyncThrottler - Manages rate limiting across multiple API endpoints
 */
class AsyncThrottler {
  constructor(config = {}) {
    this.logger = config.logger || new Logger('throttler');
    this.endpoints = new Map(); // name -> TokenBucket
    this.defaultConfig = { ...DEFAULT_ENDPOINT_CONFIG, ...config };
    this._maxRetries = config.maxRetries || 3;
    this._baseRetryMs = config.baseRetryMs || 1000;
    this._maxRetryMs = config.maxRetryMs || 30000;
    this._stats = {
      totalCalls: 0,
      throttledCalls: 0,
      retriedCalls: 0,
      failedCalls: 0,
    };
  }

  /**
   * Register an API endpoint with rate limiting config
   */
  registerEndpoint(name, config = {}) {
    const merged = { ...DEFAULT_ENDPOINT_CONFIG, ...config };
    this.endpoints.set(name, new TokenBucket(merged));
    this.logger.debug(`Endpoint registered: ${name} (capacity=${merged.capacity}, rate=${merged.refillRate})`);
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(name) {
    this.endpoints.delete(name);
  }

  /**
   * Execute an API call with throttling and retry
   * @param {string} endpoint - endpoint name
   * @param {Function} apiCall - async function to call
   * @param {Object} options - { retries, priority }
   * @returns {Promise<any>} - result of apiCall
   */
  async call(endpoint, apiCall, options = {}) {
    const maxRetries = options.retries ?? this._maxRetries;
    this._stats.totalCalls++;

    // Auto-register endpoint if not found (using defaults)
    if (!this.endpoints.has(endpoint)) {
      this.registerEndpoint(endpoint);
    }

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Wait for a token to become available
      await this._waitForToken(endpoint);

      try {
        const result = await apiCall();
        return result;
      } catch (err) {
        lastError = err;
        this.logger.warn(`API call failed [${endpoint}] attempt ${attempt + 1}/${maxRetries + 1}: ${err.message}`);

        if (attempt < maxRetries) {
          this._stats.retriedCalls++;
          const backoff = this._calcBackoff(attempt);
          this.logger.debug(`Retrying in ${backoff}ms...`);
          await this._sleep(backoff);
        }
      }
    }

    this._stats.failedCalls++;
    throw lastError;
  }

  /**
   * Execute multiple calls with throttling
   * @param {Array<{endpoint, fn, options}>} calls
   * @returns {Promise<Array>} results in order
   */
  async callAll(calls) {
    return Promise.all(
      calls.map(({ endpoint, fn, options }) =>
        this.call(endpoint, fn, options).catch(err => ({ error: err }))
      )
    );
  }

  /**
   * Wait until a token is available for the given endpoint
   * @private
   */
  async _waitForToken(endpoint) {
    const bucket = this.endpoints.get(endpoint);
    if (!bucket) return;

    let waitMs = bucket.waitTimeMs();
    if (waitMs > 0) {
      this._stats.throttledCalls++;
      this.logger.debug(`Throttled [${endpoint}]: waiting ${waitMs}ms`);
      await this._sleep(waitMs);
    }
  }

  /**
   * Exponential backoff calculation with jitter
   * @private
   */
  _calcBackoff(attempt) {
    const base = this._baseRetryMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * base; // 0-30% jitter
    return Math.min(base + jitter, this._maxRetryMs);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current state of all endpoints
   */
  getEndpointStatus() {
    const status = {};
    for (const [name, bucket] of this.endpoints) {
      status[name] = {
        tokens: bucket.tokens,
        capacity: bucket.capacity,
        refillRate: bucket.refillRate,
        waitTimeMs: bucket.waitTimeMs(),
      };
    }
    return status;
  }

  /**
   * Get throttler statistics
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this._stats.totalCalls = 0;
    this._stats.throttledCalls = 0;
    this._stats.retriedCalls = 0;
    this._stats.failedCalls = 0;
  }
}

module.exports = { AsyncThrottler, TokenBucket, DEFAULT_ENDPOINT_CONFIG };

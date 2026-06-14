/**
 * Safety Layer — The most critical component of MantleArb.
 * 
 * This module enforces hard safety constraints that CANNOT be overridden
 * by the AI advisor or any other component. All trade proposals must pass
 * through this layer before execution.
 * 
 * Safety checks:
 * 1. Router Whitelist — only approved DEX routers
 * 2. Token Whitelist — only approved tokens
 * 3. Profit Check — minimum profit threshold must be met
 * 4. Slippage Protection — max slippage enforced
 * 5. Gas Limit — max gas cost enforced
 */

const config = require('../config/default.json');

class SafetyLayer {
  constructor(customConfig) {
    const cfg = customConfig || config.safety;
    this.routerWhitelist = new Set(
      (cfg.routerWhitelist || []).map(addr => addr.toLowerCase())
    );
    this.tokenWhitelist = new Set(
      (cfg.tokenWhitelist || []).map(addr => addr.toLowerCase())
    );
    this.minProfitThresholdBps = cfg.minProfitThresholdBps || 50;
    this.maxSlippageBps = cfg.maxSlippageBps || 100;
    this.maxGasCostWei = BigInt(cfg.maxGasCostWei || '100000000000000000');
    this.requireProfitCheck = cfg.requireProfitCheck !== false;
  }

  /**
   * Validate a trade proposal against ALL safety constraints.
   * Returns { valid: boolean, errors: string[] }
   */
  validateTradeProposal(proposal) {
    const errors = [];

    // 1. Router Whitelist Check
    if (!this._isRouterWhitelisted(proposal.router)) {
      errors.push(`Router ${proposal.router} is NOT in whitelist. Trade rejected.`);
    }

    // 2. Token Whitelist Check
    const tokens = proposal.tokens || [];
    for (const token of tokens) {
      if (!this._isTokenWhitelisted(token)) {
        errors.push(`Token ${token} is NOT in whitelist. Trade rejected.`);
      }
    }

    // 3. Profit Check
    if (this.requireProfitCheck) {
      const profitBps = proposal.estimatedProfitBps || 0;
      if (profitBps < this.minProfitThresholdBps) {
        errors.push(
          `Estimated profit ${profitBps} bps is below minimum threshold ${this.minProfitThresholdBps} bps. Trade rejected.`
        );
      }
    }

    // 4. Slippage Check
    if (proposal.slippageBps && proposal.slippageBps > this.maxSlippageBps) {
      errors.push(
        `Slippage ${proposal.slippageBps} bps exceeds maximum ${this.maxSlippageBps} bps. Trade rejected.`
      );
    }

    // 5. Gas Cost Check
    if (proposal.estimatedGasCostWei) {
      const gasCost = BigInt(proposal.estimatedGasCostWei);
      if (gasCost > this.maxGasCostWei) {
        errors.push(
          `Gas cost ${gasCost.toString()} wei exceeds maximum ${this.maxGasCostWei.toString()} wei. Trade rejected.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  _isRouterWhitelisted(router) {
    if (!router) return false;
    return this.routerWhitelist.has(router.toLowerCase());
  }

  _isTokenWhitelisted(token) {
    if (!token) return false;
    return this.tokenWhitelist.has(token.toLowerCase());
  }

  /**
   * Add a router to the whitelist (admin operation).
   */
  addRouterToWhitelist(address) {
    this.routerWhitelist.add(address.toLowerCase());
  }

  /**
   * Add a token to the whitelist (admin operation).
   */
  addTokenToWhitelist(address) {
    this.tokenWhitelist.add(address.toLowerCase());
  }

  /**
   * Get current whitelist state (for API exposure).
   */
  getWhitelistState() {
    return {
      routers: Array.from(this.routerWhitelist),
      tokens: Array.from(this.tokenWhitelist),
      minProfitThresholdBps: this.minProfitThresholdBps,
      maxSlippageBps: this.maxSlippageBps,
    };
  }
}

module.exports = { SafetyLayer };

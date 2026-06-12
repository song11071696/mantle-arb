/**
 * AI Advisor Module — Advisory Only
 * 
 * IMPORTANT: This module generates trade SUGGESTIONS only.
 * It does NOT execute trades, control funds, or override safety checks.
 * 
 * Architecture:
 * - Receives market data from Market Monitor
 * - Analyzes potential arbitrage routes
 * - Outputs ranked suggestions with confidence scores
 * - All suggestions MUST pass through SafetyLayer before execution
 * 
 * AI Decision Boundary:
 * - AI decisions are advisory only
 * - AI cannot access private keys or wallets
 * - AI recommendations may be incorrect
 * - Deterministic safety checks always override AI suggestions
 */

const config = require('../config/default.json');

class AIAdvisor {
  constructor() {
    this.enabled = config.ai?.enabled !== false;
    this.advisoryOnly = true; // CANNOT be overridden
    this.maxRecommendations = config.ai?.maxRecommendationsPerCycle || 5;
  }

  /**
   * Analyze market data and generate arbitrage suggestions.
   * Returns an array of SUGGESTIONS — NOT trade orders.
   * 
   * @param {Object} marketData - Current market state from MarketMonitor
   * @returns {Object[]} Array of advisory suggestions
   */
  async analyze(marketData) {
    if (!this.enabled) {
      return [];
    }

    const suggestions = [];

    // Analyze price differences across pools
    for (const pair of (marketData.pairs || [])) {
      const priceDiff = this._calculatePriceDifference(pair);
      if (priceDiff > 0) {
        suggestions.push({
          type: 'ADVISORY_SUGGESTION',
          pair: pair.symbol,
          estimatedProfitBps: priceDiff,
          route: pair.route,
          confidence: this._estimateConfidence(pair),
          timestamp: new Date().toISOString(),
          disclaimer: 'This is an advisory suggestion only. Must pass safety validation before execution.',
        });
      }
    }

    // Sort by estimated profit descending, limit to max
    suggestions.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
    return suggestions.slice(0, this.maxRecommendations);
  }

  /**
   * Generate a risk score for a given suggestion.
   * Returns a score from 0 (lowest risk) to 100 (highest risk).
   * This is ALSO advisory only.
   */
  assessRisk(suggestion) {
    let riskScore = 0;

    // Lower confidence = higher risk
    riskScore += (1 - (suggestion.confidence || 0.5)) * 40;

    // Larger profit estimates may indicate suspicious opportunities
    if (suggestion.estimatedProfitBps > 500) {
      riskScore += 30; // Very high profit = potentially suspicious
    }

    // Clamp to 0-100
    return Math.min(100, Math.max(0, Math.round(riskScore)));
  }

  _calculatePriceDifference(pair) {
    // Placeholder: in production this would use real price data
    if (!pair.prices || pair.prices.length < 2) return 0;
    const min = Math.min(...pair.prices);
    const max = Math.max(...pair.prices);
    return Math.round(((max - min) / min) * 10000); // basis points
  }

  _estimateConfidence(pair) {
    // Placeholder confidence estimation
    return 0.5; // Default: uncertain
  }
}

module.exports = { AIAdvisor };

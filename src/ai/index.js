/**
 * AI Module Entry Point
 */

const { PricePredictor } = require('./price-predictor');
const { SignalGenerator } = require('./signal-generator');
const { RiskAssessor } = require('./risk-assessor');
const { Logger } = require('../utils/logger');

class AIEngine {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('ai');
    this.pricePredictor = new PricePredictor(config);
    this.signalGenerator = new SignalGenerator(config);
    this.riskAssessor = new RiskAssessor(config);
  }

  /**
   * Full AI pipeline: predict -> signal -> risk assess
   * @param {Object} marketData - { prices, volumes, pair }
   * @param {Object} tradeProposal - Proposed trade details
   * @param {Object} portfolio - Current portfolio state
   * @returns {Object} - AI decision
   */
  async analyze(marketData, tradeProposal, portfolio) {
    const prediction = this.pricePredictor.predict(marketData.prices);
    const signal = this.signalGenerator.generate({
      ...marketData,
      prediction,
    });
    const risk = this.riskAssessor.assess(tradeProposal, portfolio);

    const shouldTrade = risk.approved && signal.action !== 'hold' && signal.confidence > 0.6;

    return {
      prediction,
      signal,
      risk,
      decision: shouldTrade ? 'execute' : 'skip',
      reasoning: {
        predictedTrend: prediction.trend,
        signalAction: signal.action,
        signalConfidence: signal.confidence,
        riskApproved: risk.approved,
        riskScore: risk.riskScore,
        reasons: [...signal.reasons, ...risk.reasons],
      },
    };
  }
}

module.exports = { AIEngine, PricePredictor, SignalGenerator, RiskAssessor };

/**
 * Execution Engine — Constructs, signs, and submits transactions.
 * 
 * This module CANNOT execute trades that have not been validated
 * by the SafetyLayer. It enforces:
 * - Mode check (manual vs auto)
 * - Confirmation requirement
 * - Retry logic with limits
 */

const config = require('../config/default.json');

class ExecutionEngine {
  constructor(safetyLayer) {
    this.safety = safetyLayer;
    this.mode = config.execution.mode || 'manual';
    this.autoConfirm = config.execution.autoConfirm || false;
    this.maxRetries = config.execution.maxRetries || 2;
  }

  /**
   * Execute a validated trade proposal.
   * The proposal MUST have already passed SafetyLayer validation.
   */
  async execute(proposal, safetyValidation) {
    // Double-check: ensure safety validation passed
    if (!safetyValidation || !safetyValidation.valid) {
      throw new Error('Cannot execute: proposal has not passed safety validation.');
    }

    // Manual mode: require confirmation
    if (this.mode === 'manual' && !this.autoConfirm) {
      return {
        status: 'awaiting_confirmation',
        message: 'Trade passed safety checks. Manual confirmation required.',
        proposal,
      };
    }

    // Auto mode: user has explicitly opted into automatic execution
    return this._submitTransaction(proposal);
  }

  async _submitTransaction(proposal) {
    // Placeholder: in production this would build and submit the tx
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Build transaction
        const tx = {
          to: proposal.router,
          data: proposal.calldata || '0x',
          value: '0',
          gasLimit: proposal.gasLimit || '500000',
        };

        // In production: sign and submit
        return {
          status: 'submitted',
          txHash: '0x' + '0'.repeat(64), // placeholder
          attempt: attempt + 1,
        };
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    return {
      status: 'failed',
      error: lastError?.message || 'Unknown error after retries',
    };
  }
}

module.exports = { ExecutionEngine };

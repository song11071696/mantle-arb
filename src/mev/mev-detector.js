/**
 * MEV Detector
 *
 * Monitors the mempool and on-chain transactions to detect
 * MEV attacks: sandwich attacks, front-running, back-running,
 * and JIT liquidity provision.
 */

const { ethers } = require('ethers');

/**
 * MEV attack types
 */
const MevType = {
  FRONT_RUN: 'front_run',
  BACK_RUN: 'back_run',
  SANDWICH: 'sandwich',
  JIT_LIQUIDITY: 'jit_liquidity',
  ARBITRAGE: 'arbitrage',
  LIQUIDATION: 'liquidation',
};

/**
 * Known MEV bot addresses (examples)
 */
const KNOWN_MEV_BOTS = new Set([
  '0x0000000000000000000000000000000000000000', // placeholder
]);

// Function signatures for common DEX operations
const SWAP_SIGNATURES = {
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0xfb3bdb41': 'swapETHForExactTokens',
  '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  '0x02751cec': 'removeLiquidity',
  '0xbaa2abde': 'removeLiquidityETH',
  '0x022c0d9f': 'swap', // Uniswap V3
};

class MevDetector {
  constructor(config = {}) {
    this.provider = config.provider;
    this.wsProvider = config.wsProvider;
    this.monitoredAddresses = new Set(config.monitoredAddresses || []);
    this.alertThreshold = config.alertThreshold || 0.01; // 1% impact
    this.pendingTxs = new Map();
    this.detectedAttacks = [];
    this.isMonitoring = false;
    this.subscription = null;

    // Statistical tracking
    this.stats = {
      transactionsScanned: 0,
      attacksDetected: 0,
      sandwichAttacks: 0,
      frontRuns: 0,
      estimatedSaved: BigInt(0),
    };
  }

  /**
   * Start mempool monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) return;

    const provider = this.wsProvider || this.provider;

    // Subscribe to pending transactions
    this.subscription = provider.on('pending', async (txHash) => {
      try {
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.to) {
          await this._analyzeTransaction(tx);
        }
      } catch {
        // Transaction may have been dropped
      }
    });

    this.isMonitoring = true;
    return true;
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (this.subscription) {
      const provider = this.wsProvider || this.provider;
      provider.removeAllListeners('pending');
      this.subscription = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Analyze a pending transaction for MEV patterns
   */
  async _analyzeTransaction(tx) {
    this.stats.transactionsScanned++;

    // Check if it's a swap transaction
    if (!tx.data || tx.data.length < 10) return;
    const methodSig = tx.data.slice(0, 10);
    if (!SWAP_SIGNATURES[methodSig]) return;

    // Store pending swap
    const entry = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice || tx.maxFeePerGas || BigInt(0),
      data: tx.data,
      method: SWAP_SIGNATURES[methodSig],
      timestamp: Date.now(),
      blockNumber: tx.blockNumber,
    };

    this.pendingTxs.set(tx.hash, entry);

    // Check for sandwich patterns
    await this._checkSandwich(entry);

    // Check for front-running
    await this._checkFrontRunning(entry);

    // Clean old entries
    this._cleanupPending();
  }

  /**
   * Detect sandwich attack patterns
   */
  async _checkSandwich(tx) {
    const recentTxs = Array.from(this.pendingTxs.values())
      .filter(t => Date.now() - t.timestamp < 15000) // Last 15 seconds
      .sort((a, b) => b.gasPrice - a.gasPrice);

    // Look for: same token pair, different gas prices, same target contract
    for (let i = 0; i < recentTxs.length; i++) {
      for (let j = i + 1; j < recentTxs.length; j++) {
        const txA = recentTxs[i];
        const txB = recentTxs[j];

        if (txA.to !== txB.to) continue;
        if (txA.from === txB.from) continue;

        // Check if one has significantly higher gas (frontrunner)
        const gasDiff = Number(txA.gasPrice - txB.gasPrice) / Number(txB.gasPrice);
        if (gasDiff > 0.1) { // 10% higher gas
          const tokensA = this._extractTokensFromSwap(txA.data);
          const tokensB = this._extractTokensFromSwap(txB.data);

          if (tokensA && tokensB && tokensA[0] === tokensB[0] && tokensA[1] === tokensB[1]) {
            const attack = {
              type: MevType.SANDWICH,
              frontTx: txA.hash,
              victimTx: txB.hash,
              attacker: txA.from,
              victim: txB.from,
              tokenPair: tokensA,
              gasPremium: gasDiff,
              timestamp: Date.now(),
              estimatedLoss: 'unknown',
            };

            this.detectedAttacks.push(attack);
            this.stats.attacksDetected++;
            this.stats.sandwichAttacks++;
            this.emit('mev:detected', attack);
          }
        }
      }
    }
  }

  /**
   * Detect front-running patterns
   */
  async _checkFrontRunning(tx) {
    // Check if a known MEV bot submitted a similar tx with higher gas
    for (const [hash, pending] of this.pendingTxs) {
      if (hash === tx.hash) continue;
      if (!KNOWN_MEV_BOTS.has(pending.from)) continue;

      if (pending.to === tx.to) {
        const gasDiff = Number(pending.gasPrice - tx.gasPrice) / Number(tx.gasPrice);
        if (gasDiff > 0.05) { // 5% higher gas
          const attack = {
            type: MevType.FRONT_RUN,
            attackerTx: pending.hash,
            victimTx: tx.hash,
            attacker: pending.from,
            victim: tx.from,
            gasPremium: gasDiff,
            timestamp: Date.now(),
          };

          this.detectedAttacks.push(attack);
          this.stats.attacksDetected++;
          this.stats.frontRuns++;
          this.emit('mev:detected', attack);
        }
      }
    }
  }

  /**
   * Extract token addresses from swap calldata
   */
  _extractTokensFromSwap(data) {
    try {
      // Decode path from swap calldata (simplified)
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
        '0x' + data.slice(10)
      );
      return decoded[2]; // path array
    } catch {
      return null;
    }
  }

  /**
   * Analyze historical transaction for MEV
   */
  async analyzeHistorical(txHash) {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) return null;

    const receipt = await this.provider.getTransactionReceipt(txHash);
    const block = await this.provider.getBlock(tx.blockNumber);

    // Get surrounding transactions in the block
    const blockTxs = [];
    for (let i = Math.max(0, tx.transactionIndex - 5); i <= Math.min(block.transactions.length - 1, tx.transactionIndex + 5); i++) {
      const surrounding = await this.provider.getTransaction(block.transactions[i]);
      if (surrounding) blockTxs.push(surrounding);
    }

    const analysis = {
      txHash,
      position: tx.transactionIndex,
      totalInBlock: block.transactions.length,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      surroundingTxs: blockTxs.length,
      potentialMev: false,
      type: null,
    };

    // Check for MEV patterns
    for (const surrounding of blockTxs) {
      if (surrounding.hash === txHash) continue;
      if (surrounding.to === tx.to && surrounding.from !== tx.from) {
        analysis.potentialMev = true;
        analysis.type = MevType.SANDWICH;
        break;
      }
    }

    return analysis;
  }

  /**
   * Calculate price impact of a pending transaction
   */
  estimatePriceImpact(tx, poolState) {
    if (!poolState) return 0;

    const amountIn = Number(tx.value);
    const reserveIn = Number(poolState.reserveIn);
    const reserveOut = Number(poolState.reserveOut);

    // Constant product formula
    const amountInWithFee = amountIn * 997;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000 + amountInWithFee;
    const amountOut = numerator / denominator;

    const spotPrice = reserveOut / reserveIn;
    const executionPrice = amountOut / amountIn;
    return Math.abs(spotPrice - executionPrice) / spotPrice;
  }

  /**
   * Clean up old pending transactions
   */
  _cleanupPending() {
    const now = Date.now();
    for (const [hash, tx] of this.pendingTxs) {
      if (now - tx.timestamp > 60000) { // 1 minute old
        this.pendingTxs.delete(hash);
      }
    }
  }

  /**
   * Emit events (EventEmitter-like)
   */
  emit(event, data) {
    if (this._listeners && this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        cb(data);
      }
    }
  }

  on(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return this;
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingTxsTracked: this.pendingTxs.size,
      detectionRate: this.stats.transactionsScanned > 0
        ? (this.stats.attacksDetected / this.stats.transactionsScanned * 100).toFixed(2) + '%'
        : 'N/A',
    };
  }

  /**
   * Get recent detected attacks
   */
  getRecentAttacks(limit = 50) {
    return this.detectedAttacks.slice(-limit);
  }
}

module.exports = { MevDetector, MevType, KNOWN_MEV_BOTS, SWAP_SIGNATURES };

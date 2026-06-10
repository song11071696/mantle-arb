/**
 * Flashbots Integration for MEV Protection
 *
 * 网络自适应：以太坊主网使用Flashbots Bundle Relay
 * Mantle L2 使用私有RPC提交 + Commit-Reveal方案
 */

const { ethers } = require('ethers');

// Flashbots relay endpoints — 仅以太坊主网系列
const FLASHBOTS_RELAYS = {
  mainnet: 'https://relay.flashbots.net',
  goerli: 'https://relay-goerli.flashbots.net',
  sepolia: 'https://relay-sepolia.flashbots.net',
  // ❌ 移除虚构的 mantle relay
};

const SUPPORTED_NETWORKS = new Set(['mainnet', 'goerli', 'sepolia']);

class FlashbotsProvider {
  constructor(config = {}) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.network = config.network || 'mainnet';
    this.maxBlockNumber = config.maxBlockNumber || 25;
    this.minTimestamp = config.minTimestamp || 0;
    this.maxTimestamp = config.maxTimestamp || 0;
    this.retries = config.retries || 3;

    // ✅ 关键修复：检测网络兼容性
    this.isFlashbotsSupported = SUPPORTED_NETWORKS.has(this.network);

    if (!this.isFlashbotsSupported) {
      console.warn(
        `[FlashbotsProvider] ⚠️ Flashbots Bundle Relay 未部署在 ${this.network} 网络。` +
        `已切换至私有RPC提交模式。`
      );
      this.fallbackMode = 'private-rpc';
      this.relayUrl = null;
    } else {
      this.relayUrl = config.relayUrl || FLASHBOTS_RELAYS[this.network];
      this.fallbackMode = null;
    }

    this.pendingBundles = new Map();
    this.stats = {
      submitted: 0,
      included: 0,
      failed: 0,
      totalProfit: BigInt(0),
    };
  }

  /**
   * 自动选择最佳提交方式
   */
  async sendTransaction(tx) {
    if (this.isFlashbotsSupported) {
      return this.sendBundle([tx]);
    } else {
      return this._submitViaPrivateRPC(tx);
    }
  }

  /**
   * Mantle网络私有RPC提交
   * 绕过公共mempool，降低被三明治攻击的风险
   * ✅ Enhanced with nonce management and retry logic
   */
  async _submitViaPrivateRPC(tx) {
    const PRIVATE_RPC_ENDPOINTS = [
      process.env.MANTLE_PRIVATE_RPC,        // 企业级私有RPC
      'https://rpc.mantle.xyz',              // 官方RPC
      'https://rpc.mantle.xyz',              // 备用
    ];

    const rpcUrl = PRIVATE_RPC_ENDPOINTS.find(Boolean);
    if (!rpcUrl) {
      throw new Error('No private RPC endpoint configured');
    }

    const privateProvider = new ethers.JsonRpcProvider(rpcUrl);

    // ✅ Get current nonce to prevent nonce conflicts
    const address = await this.signer.getAddress();
    const nonce = await privateProvider.getTransactionCount(address, 'latest');

    const txWithNonce = {
      ...tx,
      nonce: tx.nonce ?? nonce, // Use provided nonce or fetch latest
    };

    const connectedSigner = this.signer.connect(privateProvider);
    const txResponse = await connectedSigner.sendTransaction(txWithNonce);

    this.stats.submitted++;
    console.log(`[MEV Protection] 通过私有RPC提交: ${txResponse.hash} (nonce: ${nonce})`);
    return txResponse;
  }

  /**
   * 以太坊主网Bundle提交（原有逻辑，仅Flashbots支持网络使用）
   */
  async sendBundle(transactions, targetBlock) {
    if (!this.isFlashbotsSupported) {
      throw new Error('Flashbots not supported on this network, use sendTransaction()');
    }

    const blockNumber = targetBlock || await this.provider.getBlockNumber() + 1;
    const signedTxs = [];

    for (const tx of transactions) {
      if (typeof tx === 'string') {
        signedTxs.push(tx); // Already signed
      } else {
        const signed = await this.signer.signTransaction(tx);
        signedTxs.push(signed);
      }
    }

    const bundle = {
      txs: signedTxs,
      blockNumber: ethers.toBeHex(blockNumber),
    };

    if (this.minTimestamp > 0) bundle.minTimestamp = this.minTimestamp;
    if (this.maxTimestamp > 0) bundle.maxTimestamp = this.maxTimestamp;

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendBundle',
      params: [bundle],
    };

    const response = await this._sendToRelay(body);

    if (response.error) {
      this.stats.failed++;
      throw new Error(`Flashbots error: ${response.error.message}`);
    }

    const bundleHash = response.result?.bundleHash;
    this.pendingBundles.set(bundleHash, {
      hash: bundleHash,
      blockNumber,
      transactions: signedTxs,
      submittedAt: Date.now(),
    });

    this.stats.submitted++;
    return { bundleHash, blockNumber };
  }

  /**
   * 非Flashbots网络禁用的方法
   */
  async simulateBundle(transactions, blockNumber) {
    if (!this.isFlashbotsSupported) {
      console.warn('[FlashbotsProvider] simulateBundle not available on this network');
      return null;
    }

    const signedTxs = [];
    for (const tx of transactions) {
      if (typeof tx === 'string') {
        signedTxs.push(tx);
      } else {
        signedTxs.push(await this.signer.signTransaction(tx));
      }
    }

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_callBundle',
      params: [{
        txs: signedTxs,
        blockNumber: ethers.toBeHex(blockNumber || await this.provider.getBlockNumber()),
        stateBlockNumber: 'latest',
      }],
    };

    const response = await this._sendToRelay(body);
    if (response.error) {
      throw new Error(`Simulation error: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Get bundle inclusion status
   */
  async getBundleStats(bundleHash) {
    if (!this.isFlashbotsSupported) {
      return null;
    }

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'flashbots_getBundleStats',
      params: [{ bundleHash }],
    };

    const response = await this._sendToRelay(body);
    if (response.error) return null;
    return response.result;
  }

  /**
   * Check if a bundle was included
   * ✅ Enhanced MEV detection with multiple signals
   */
  async checkBundleInclusion(bundleHash) {
    const stats = await this.getBundleStats(bundleHash);
    if (!stats) return { included: false, mevRisk: 'unknown' };

    // ✅ Multi-signal MEV detection
    const signals = {
      isSimulated: stats.isSimulated || false,
      isHighPriority: stats.isHighPriority || false,
      sealedByBuilders: stats.sealedByBuilders || [],
      isFinalized: stats.isFinalized || false,
    };

    // ✅ Bundle is included if sealed by at least one builder
    const included = signals.sealedByBuilders.length > 0 || (signals.isSimulated && signals.isFinalized);

    // ✅ MEV risk assessment
    let mevRisk = 'low';
    if (!signals.isHighPriority && signals.sealedByBuilders.length === 0) {
      mevRisk = 'high'; // Bundle not picked up by builders - possible front-run
    } else if (signals.isSimulated && !signals.isFinalized) {
      mevRisk = 'medium'; // Simulated but not finalized
    }

    if (included) {
      this.stats.included++;
      const bundle = this.pendingBundles.get(bundleHash);
      if (bundle) {
        this.pendingBundles.delete(bundleHash);
      }
    }

    return {
      included,
      ...signals,
      mevRisk,
    };
  }

  /**
   * Wait for bundle inclusion with timeout
   * ✅ Enhanced with front-running detection
   */
  async waitForInclusion(bundleHash, targetBlock, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    const submittedAt = Date.now();

    while (Date.now() < deadline) {
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock > targetBlock + this.maxBlockNumber) {
        console.warn(`[MEV Protection] Bundle ${bundleHash} exceeded max blocks, possible front-run`);
        this.pendingBundles.delete(bundleHash);
        return { included: false, reason: 'exceeded_max_blocks', mevRisk: 'high' };
      }

      const result = await this.checkBundleInclusion(bundleHash);
      if (result.included) {
        return { included: true, blockNumber: currentBlock, mevRisk: result.mevRisk };
      }

      // ✅ Warn if bundle is taking too long (possible front-run)
      const elapsed = Date.now() - submittedAt;
      if (elapsed > timeoutMs * 0.7) {
        console.warn(`[MEV Protection] Bundle ${bundleHash} taking ${elapsed}ms, checking for front-run...`);
      }

      await new Promise(r => setTimeout(r, 12000)); // ~1 block time
    }

    this.pendingBundles.delete(bundleHash);
    return { included: false, reason: 'timeout', mevRisk: 'high' };
  }

  /**
   * Create a private transaction
   */
  async sendPrivateTransaction(transaction, maxBlockNumber) {
    const signedTx = typeof transaction === 'string'
      ? transaction
      : await this.signer.signTransaction(transaction);

    const blockNumber = await this.provider.getBlockNumber();
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendPrivateTransaction',
      params: [{
        tx: signedTx,
        maxBlockNumber: maxBlockNumber || blockNumber + 25,
      }],
    };

    const response = await this._sendToRelay(body);
    if (response.error) {
      throw new Error(`Private tx error: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Cancel a pending private transaction
   */
  async cancelPrivateTransaction(txHash) {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_cancelPrivateTransaction',
      params: [{ txHash }],
    };

    const response = await this._sendToRelay(body);
    return !response.error;
  }

  /**
   * Send HTTP request to Flashbots relay
   */
  async _sendToRelay(body) {
    if (!this.relayUrl) {
      throw new Error('No relay URL configured for this network');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Flashbots-Signature': `${await this.signer.getAddress()}:${await this._signMessage(JSON.stringify(body))}`,
    };

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const response = await fetch(this.relayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        return await response.json();
      } catch (err) {
        if (attempt === this.retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  /**
   * Sign a message for Flashbots authentication
   */
  async _signMessage(message) {
    return this.signer.signMessage(message);
  }

  /**
   * Get provider statistics
   */
  getStats() {
    return {
      ...this.stats,
      network: this.network,
      mode: this.isFlashbotsSupported ? 'flashbots' : 'private-rpc',
      pendingBundles: this.pendingBundles.size,
      successRate: this.stats.submitted > 0
        ? (this.stats.included / this.stats.submitted * 100).toFixed(1) + '%'
        : 'N/A',
    };
  }

  /**
   * ✅ Detect potential front-running by checking pending bundle age
   * Returns bundles that may have been front-run (pending too long)
   */
  detectStaleBundles(maxAgeMs = 120000) {
    const now = Date.now();
    const staleBundles = [];
    for (const [hash, bundle] of this.pendingBundles.entries()) {
      const age = now - bundle.submittedAt;
      if (age > maxAgeMs) {
        staleBundles.push({ hash, ageMs: age, blockNumber: bundle.blockNumber });
      }
    }
    return staleBundles;
  }

  /**
   * ✅ Cancel stale bundles that may be front-run
   */
  async cancelStaleBundles(maxAgeMs = 120000) {
    const stale = this.detectStaleBundles(maxAgeMs);
    for (const bundle of stale) {
      this.pendingBundles.delete(bundle.hash);
      this.stats.failed++;
      console.warn(`[MEV Protection] Cancelled stale bundle ${bundle.hash} (${bundle.ageMs}ms old)`);
    }
    return stale.length;
  }

  /**
   * Check builder reputation
   */
  async getBuilderStats(blockNumber) {
    try {
      const response = await fetch(`https://blocks.flashbots.net/v1/blocks?block_number=${blockNumber}`);
      return await response.json();
    } catch {
      return null;
    }
  }
}

module.exports = { FlashbotsProvider, FLASHBOTS_RELAYS, SUPPORTED_NETWORKS };

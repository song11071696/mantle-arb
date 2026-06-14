/**
 * Commit-Reveal方案：隐藏交易意图，防止抢跑
 *
 * 流程：
 * 1. Commit阶段：提交哈希(commit = keccak256(intent + secret + nonce))
 * 2. 等待N个区块确认
 * 3. Reveal阶段：公开实际交易参数
 */

const { ethers } = require('ethers');

const MAX_COMMIT_AGE_BLOCKS = 100; // ✅ Commit过期区块数
const MIN_COMMIT_DELAY = 1;        // ✅ 最小等待区块数

class CommitRevealProtector {
  constructor(config = {}) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.commitDelay = config.commitDelay || 2; // 等待2个区块
    this.pendingCommits = new Map();
    // ✅ Track used secrets to prevent replay
    this.usedSecrets = new Set();
  }

  /**
   * 第一步：提交承诺哈希
   */
  async commitArbitrage(arbitrageParams) {
    // ✅ Validate input parameters
    if (!arbitrageParams.token || !arbitrageParams.amount || !arbitrageParams.routerA || !arbitrageParams.routerB) {
      throw new Error('Missing required arbitrage parameters');
    }
    if (arbitrageParams.amount <= 0n) {
      throw new Error('Amount must be positive');
    }

    const secret = ethers.randomBytes(32);

    // ✅ Verify secret is not zero (extremely unlikely but defensive)
    if (ethers.hexlify(secret) === ethers.ZeroHash) {
      throw new Error('Generated secret is zero, retry');
    }

    const nonce = Date.now();

    const intent = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address', 'address', 'address[]', 'address[]'],
      [
        arbitrageParams.token,
        arbitrageParams.amount,
        arbitrageParams.routerA,
        arbitrageParams.routerB,
        arbitrageParams.pathA,
        arbitrageParams.pathB
      ]
    );

    const commit = ethers.keccak256(
      ethers.concat([intent, secret, ethers.toBeHex(nonce, 32)])
    );

    const commitBlock = await this.provider.getBlockNumber();

    this.pendingCommits.set(commit, {
      params: arbitrageParams,
      secret,
      nonce,
      commitBlock,
      intent,
    });

    return { commit, secret, nonce, revealAfter: commitBlock + this.commitDelay };
  }

  /**
   * 第二步：揭示并执行
   */
  async revealAndExecute(commit) {
    const pending = this.pendingCommits.get(commit);
    if (!pending) throw new Error('Commit not found');

    const currentBlock = await this.provider.getBlockNumber();

    // ✅ Check commit hasn't expired
    if (currentBlock > pending.commitBlock + MAX_COMMIT_AGE_BLOCKS) {
      this.pendingCommits.delete(commit);
      throw new Error('Commit expired, please create a new one');
    }

    if (currentBlock < pending.commitBlock + this.commitDelay) {
      throw new Error(`Too early to reveal. Wait until block ${pending.commitBlock + this.commitDelay}`);
    }

    // ✅ Verify commit hash matches before execution
    const recomputed = ethers.keccak256(
      ethers.concat([
        pending.intent,
        pending.secret,
        ethers.toBeHex(pending.nonce, 32)
      ])
    );
    if (recomputed !== commit) {
      throw new Error('Commit hash mismatch - data integrity error');
    }

    // ✅ Mark secret as used to prevent replay
    const secretHex = ethers.hexlify(pending.secret);
    if (this.usedSecrets.has(secretHex)) {
      throw new Error('Secret already used - replay detected');
    }
    this.usedSecrets.add(secretHex);

    const tx = await this._executeWithParams(pending.params);

    this.pendingCommits.delete(commit);
    return tx;
  }

  /**
   * 清理过期的commit（超过MAX_COMMIT_AGE_BLOCKS个区块未reveal）
   */
  cleanupExpiredCommits(currentBlock) {
    for (const [commit, data] of this.pendingCommits.entries()) {
      if (currentBlock > data.commitBlock + MAX_COMMIT_AGE_BLOCKS) {
        this.pendingCommits.delete(commit);
      }
    }
  }
}

module.exports = { CommitRevealProtector, MAX_COMMIT_AGE_BLOCKS, MIN_COMMIT_DELAY };

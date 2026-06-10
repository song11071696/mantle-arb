/**
 * Commit-Reveal方案：隐藏交易意图，防止抢跑
 *
 * 流程：
 * 1. Commit阶段：提交哈希(commit = keccak256(intent + secret + nonce))
 * 2. 等待N个区块确认
 * 3. Reveal阶段：公开实际交易参数
 */

const { ethers } = require('ethers');

class CommitRevealProtector {
  constructor(config = {}) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.commitDelay = config.commitDelay || 2; // 等待2个区块
    this.pendingCommits = new Map();
  }

  /**
   * 第一步：提交承诺哈希
   */
  async commitArbitrage(arbitrageParams) {
    const secret = ethers.randomBytes(32);
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
    if (currentBlock < pending.commitBlock + this.commitDelay) {
      throw new Error(`Too early to reveal. Wait until block ${pending.commitBlock + this.commitDelay}`);
    }

    const tx = await this._executeWithParams(pending.params);

    this.pendingCommits.delete(commit);
    return tx;
  }

  /**
   * 清理过期的commit（超过100个区块未reveal）
   */
  cleanupExpiredCommits(currentBlock) {
    for (const [commit, data] of this.pendingCommits.entries()) {
      if (currentBlock > data.commitBlock + 100) {
        this.pendingCommits.delete(commit);
      }
    }
  }
}

module.exports = { CommitRevealProtector };

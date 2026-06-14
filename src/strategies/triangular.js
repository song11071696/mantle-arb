/**
 * Triangular Arbitrage Strategy
 * Finds profitable A→B→C→A cycles across DEX pairs
 */

const { Logger } = require('../utils/logger');
const { MathUtils } = require('../utils/math');

class TriangularStrategy {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('strategy:triangular');
    this.name = 'triangular';
    this.enabled = true;
  }

  /**
   * Scan for triangular arbitrage opportunities
   * @param {Object[]} pairs - Array of trading pairs with reserves
   * @param {bigint} tradeSize - Input amount in wei
   * @returns {Object[]} - Sorted profitable paths
   */
  async scan(pairs, tradeSize) {
    const opportunities = [];
    const graph = this._buildGraph(pairs);
    const tokens = Object.keys(graph);

    for (const startToken of tokens) {
      const paths = this._findCycles(graph, startToken, 3);
      for (const path of paths) {
        const result = this._simulatePath(path, pairs, tradeSize);
        if (result && result.profitBps > 0) {
          opportunities.push({
            strategy: this.name,
            path: path.map(p => p.token),
            profitBps: result.profitBps,
            outputAmount: result.outputAmount,
            inputAmount: tradeSize,
            steps: result.steps,
          });
        }
      }
    }

    return opportunities.sort((a, b) => Number(b.profitBps - a.profitBps));
  }

  /**
   * Build adjacency graph from pairs
   */
  _buildGraph(pairs) {
    const graph = {};
    for (const pair of pairs) {
      if (!graph[pair.tokenA]) graph[pair.tokenA] = [];
      if (!graph[pair.tokenB]) graph[pair.tokenB] = [];
      graph[pair.tokenA].push({ token: pair.tokenB, pair });
      graph[pair.tokenB].push({ token: pair.tokenA, pair });
    }
    return graph;
  }

  /**
   * DFS to find cycles of given length
   */
  _findCycles(graph, start, maxLen) {
    const cycles = [];
    const dfs = (current, path, visited) => {
      if (path.length === maxLen) {
        if (current === start) cycles.push([...path]);
        return;
      }
      for (const edge of (graph[current] || [])) {
        if (edge.token !== start && path.length < maxLen - 1 && visited.has(edge.token)) continue;
        visited.add(edge.token);
        path.push({ token: edge.token, pair: edge.pair });
        dfs(edge.token, path, visited);
        path.pop();
        if (edge.token !== start) visited.delete(edge.token);
      }
    };
    dfs(start, [{ token: start, pair: null }], new Set([start]));
    return cycles;
  }

  /**
   * Simulate a path and compute output
   */
  _simulatePath(path, pairs, inputAmount) {
    let amount = inputAmount;
    const steps = [];
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const pair = curr.pair;
      if (!pair) return null;
      const isDirect = pair.tokenA === prev.token;
      const reserveIn = isDirect ? pair.reserveA : pair.reserveB;
      const reserveOut = isDirect ? pair.reserveB : pair.reserveA;
      const outAmount = MathUtils.getAmountOut(amount, reserveIn, reserveOut, pair.feeBps || 30n);
      steps.push({ from: prev.token, to: curr.token, amountIn: amount, amountOut: outAmount });
      amount = outAmount;
    }
    const profitBps = MathUtils.profitPercent(inputAmount, amount);
    return { outputAmount: amount, profitBps, steps };
  }
}

module.exports = { TriangularStrategy };

/**
 * Unit Tests for TripleBarrierManager, RunnableBase, AsyncThrottler
 * 
 * Uses Node's built-in assert module for portability.
 * Run with: node test/unit/hummingbot-modules.test.js
 */

const assert = require('assert');
const { TripleBarrierManager, BarrierType, PositionState } = require('../../src/risk/triple-barrier');
const { RunnableBase, RunState } = require('../../src/core/runnable-base');
const { AsyncThrottler, TokenBucket } = require('../../src/core/async-throttler');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    errors.push({ name, error: err });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    errors.push({ name, error: err });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

// ============================================================
// TripleBarrierManager Tests
// ============================================================
console.log('\n=== TripleBarrierManager Tests ===');

test('should create manager with default config', () => {
  const mgr = new TripleBarrierManager();
  assert.strictEqual(mgr.config.stopLossPct, 0.02);
  assert.strictEqual(mgr.config.takeProfitPct, 0.05);
  assert.strictEqual(mgr.config.enableStopLoss, true);
});

test('should open a managed position', () => {
  const mgr = new TripleBarrierManager();
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  assert.ok(pos.id);
  assert.strictEqual(pos.pair, 'ETH/USDC');
  assert.strictEqual(mgr.positions.size, 1);
});

test('should trigger stop loss barrier', () => {
  const mgr = new TripleBarrierManager({ stopLossPct: 0.05, enableTrailingStop: false });
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  // Price drops 6% -> should trigger 5% stop loss
  const barrier = mgr.evaluatePosition(pos.id, 940);
  assert.strictEqual(barrier, BarrierType.STOP_LOSS);
  assert.strictEqual(mgr.positions.size, 0);
  assert.strictEqual(mgr.closedPositions.length, 1);
  assert.strictEqual(mgr.closedPositions[0].state, PositionState.CLOSED_STOP_LOSS);
});

test('should trigger take profit barrier', () => {
  const mgr = new TripleBarrierManager({ takeProfitPct: 0.03, enableTrailingStop: false });
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  // Price rises 4% -> should trigger 3% take profit
  const barrier = mgr.evaluatePosition(pos.id, 1040);
  assert.strictEqual(barrier, BarrierType.TAKE_PROFIT);
  assert.strictEqual(mgr.closedPositions[0].state, PositionState.CLOSED_TAKE_PROFIT);
  assert.ok(mgr.closedPositions[0].pnl > 0);
});

test('should trigger time limit barrier', async () => {
  const mgr = new TripleBarrierManager({
    timeLimitMs: 100, // 100ms for testing
    enableStopLoss: false,
    enableTakeProfit: false,
    enableTrailingStop: false,
  });
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  // Wait for time limit
  await new Promise(r => setTimeout(r, 150));
  const barrier = mgr.evaluatePosition(pos.id, 1000);
  assert.strictEqual(barrier, BarrierType.TIME_LIMIT);
});

test('should trigger trailing stop for long position', () => {
  const mgr = new TripleBarrierManager({
    trailingStopPct: 0.02,
    enableTrailingStop: true,
    enableStopLoss: false,
    enableTakeProfit: false,
    enableTimeLimit: false,
  });
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  // Price goes up to 1100 (peak)
  mgr.evaluatePosition(pos.id, 1100);
  // Price drops to 1070 (3% drop from peak, > 2% trailing)
  const barrier = mgr.evaluatePosition(pos.id, 1070);
  assert.strictEqual(barrier, BarrierType.TRAILING_STOP);
});

test('should not trigger trailing stop before crossing entry', () => {
  const mgr = new TripleBarrierManager({
    trailingStopPct: 0.02,
    enableTrailingStop: true,
    enableStopLoss: false,
    enableTakeProfit: false,
    enableTimeLimit: false,
  });
  const pos = mgr.openPosition({
    pair: 'ETH/USDC',
    side: 'long',
    entryPrice: 1000,
    size: 10,
  });
  // Price drops slightly below entry
  const barrier = mgr.evaluatePosition(pos.id, 990);
  // Should NOT trigger trailing stop since peak never went above entry
  assert.strictEqual(barrier, null);
});

test('should evaluate all positions with price map', () => {
  const mgr = new TripleBarrierManager({ stopLossPct: 0.05, enableTrailingStop: false });
  mgr.openPosition({ pair: 'ETH/USDC', side: 'long', entryPrice: 1000, size: 10 });
  mgr.openPosition({ pair: 'BTC/USDC', side: 'long', entryPrice: 50000, size: 1 });
  const results = mgr.evaluateAll({ 'ETH/USDC': 940, 'BTC/USDC': 51000 });
  assert.strictEqual(results.length, 1); // Only ETH should trigger stop loss
  assert.strictEqual(results[0].barrier, BarrierType.STOP_LOSS);
});

test('should return correct stats', () => {
  const mgr = new TripleBarrierManager({ stopLossPct: 0.05, enableTrailingStop: false });
  const pos = mgr.openPosition({ pair: 'ETH/USDC', side: 'long', entryPrice: 1000, size: 10 });
  mgr.evaluatePosition(pos.id, 940);
  const stats = mgr.getStats();
  assert.strictEqual(stats.closedPositions, 1);
  assert.strictEqual(stats.wins, 0);
  assert.strictEqual(stats.losses, 1);
  assert.strictEqual(stats.barrierCounts[BarrierType.STOP_LOSS], 1);
});

test('should manually close a position', () => {
  const mgr = new TripleBarrierManager();
  const pos = mgr.openPosition({ pair: 'ETH/USDC', side: 'long', entryPrice: 1000, size: 10 });
  const result = mgr.closePosition(pos.id, 1050);
  assert.ok(result);
  assert.strictEqual(result.closeReason, BarrierType.NONE);
  assert.strictEqual(mgr.positions.size, 0);
});

// ============================================================
// RunnableBase Tests
// ============================================================
console.log('\n=== RunnableBase Tests ===');

test('should initialize in CREATED state', () => {
  const runnable = new RunnableBase({ name: 'test' });
  assert.strictEqual(runnable.state, RunState.CREATED);
  assert.strictEqual(runnable.isRunning, false);
});

test('should start and enter RUNNING state', async () => {
  const runnable = new RunnableBase({ name: 'test', tickIntervalMs: 100 });
  await runnable.start();
  assert.strictEqual(runnable.state, RunState.RUNNING);
  assert.strictEqual(runnable.isRunning, true);
  await runnable.stop();
});

test('should stop and enter STOPPED state', async () => {
  const runnable = new RunnableBase({ name: 'test', tickIntervalMs: 100 });
  await runnable.start();
  await runnable.stop();
  assert.strictEqual(runnable.state, RunState.STOPPED);
  assert.strictEqual(runnable.isRunning, false);
});

test('should call controlTask on each tick', async () => {
  let tickCount = 0;
  class TestRunnable extends RunnableBase {
    async controlTask() { tickCount++; }
  }
  const runnable = new TestRunnable({ name: 'test', tickIntervalMs: 50 });
  await runnable.start();
  await new Promise(r => setTimeout(r, 200));
  await runnable.stop();
  assert.ok(tickCount >= 2, `Expected >= 2 ticks, got ${tickCount}`);
});

test('should stop after too many consecutive errors', async () => {
  class ErrorRunnable extends RunnableBase {
    async controlTask() { throw new Error('intentional'); }
  }
  const runnable = new ErrorRunnable({ name: 'test', tickIntervalMs: 50, maxConsecutiveErrors: 3 });
  const stoppedPromise = new Promise(resolve => runnable.once('stopped', resolve));
  await runnable.start();
  await stoppedPromise;
  assert.strictEqual(runnable.state, RunState.STOPPED);
  assert.strictEqual(runnable._tickErrors, 3);
});

test('should emit tickError events', async () => {
  let errorCount = 0;
  class ErrorRunnable extends RunnableBase {
    async controlTask() { throw new Error('test error'); }
  }
  const runnable = new ErrorRunnable({ name: 'test', tickIntervalMs: 50, maxConsecutiveErrors: 100 });
  runnable.on('tickError', () => errorCount++);
  await runnable.start();
  await new Promise(r => setTimeout(r, 200));
  await runnable.stop();
  assert.ok(errorCount >= 2, `Expected >= 2 errors, got ${errorCount}`);
});

test('should return correct status', async () => {
  const runnable = new RunnableBase({ name: 'test-status', tickIntervalMs: 100 });
  const statusBefore = runnable.getStatus();
  assert.strictEqual(statusBefore.state, 'created');
  assert.strictEqual(statusBefore.name, 'test-status');

  await runnable.start();
  const statusRunning = runnable.getStatus();
  assert.strictEqual(statusRunning.state, 'running');
  assert.ok(statusRunning.startedAt > 0);

  await runnable.stop();
  const statusStopped = runnable.getStatus();
  assert.strictEqual(statusStopped.state, 'stopped');
  assert.ok(statusStopped.stoppedAt > 0);
});

// ============================================================
// AsyncThrottler Tests
// ============================================================
console.log('\n=== AsyncThrottler Tests ===');

test('should register and track endpoints', () => {
  const throttler = new AsyncThrottler();
  throttler.registerEndpoint('binance', { capacity: 5, refillRate: 2 });
  const status = throttler.getEndpointStatus();
  assert.ok(status.binance);
  assert.strictEqual(status.binance.capacity, 5);
  assert.strictEqual(status.binance.refillRate, 2);
});

test('should execute calls within rate limit without throttling', async () => {
  const throttler = new AsyncThrottler();
  throttler.registerEndpoint('test-api', { capacity: 10, refillRate: 10 });
  let callCount = 0;
  const fn = async () => { callCount++; return 'ok'; };
  const result = await throttler.call('test-api', fn);
  assert.strictEqual(result, 'ok');
  assert.strictEqual(callCount, 1);
  const stats = throttler.getStats();
  assert.strictEqual(stats.totalCalls, 1);
});

test('should retry on failure', async () => {
  const throttler = new AsyncThrottler({ baseRetryMs: 10, maxRetries: 2 });
  throttler.registerEndpoint('flaky', { capacity: 100, refillRate: 100 });
  let attempts = 0;
  const fn = async () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await throttler.call('flaky', fn, { retries: 2 });
  assert.strictEqual(result, 'success');
  assert.strictEqual(attempts, 3);
});

test('should throw after max retries exceeded', async () => {
  const throttler = new AsyncThrottler({ baseRetryMs: 10 });
  throttler.registerEndpoint('bad-api', { capacity: 100, refillRate: 100 });
  const fn = async () => { throw new Error('always fails'); };
  await assert.rejects(
    () => throttler.call('bad-api', fn, { retries: 1 }),
    { message: 'always fails' }
  );
  const stats = throttler.getStats();
  assert.strictEqual(stats.failedCalls, 1);
});

test('TokenBucket should respect capacity', () => {
  const bucket = new TokenBucket({ capacity: 3, refillRate: 1, refillIntervalMs: 10000 });
  assert.strictEqual(bucket.tryConsume(), true);
  assert.strictEqual(bucket.tryConsume(), true);
  assert.strictEqual(bucket.tryConsume(), true);
  assert.strictEqual(bucket.tryConsume(), false); // capacity exhausted
});

test('TokenBucket should calculate correct wait time', () => {
  const bucket = new TokenBucket({ capacity: 1, refillRate: 2, refillIntervalMs: 1000 });
  bucket.tryConsume(); // exhaust the token
  const waitMs = bucket.waitTimeMs();
  assert.ok(waitMs > 0, `Expected wait > 0, got ${waitMs}`);
  assert.ok(waitMs <= 1000, `Expected wait <= 1000, got ${waitMs}`);
});

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log('\nFailed tests:');
  for (const { name, error } of errors) {
    console.log(`  - ${name}: ${error.message}`);
  }
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
}

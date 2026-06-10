/**
 * Unit Tests for FlashbotsProvider and MevDetector
 *
 * Uses Node's built-in assert module for portability.
 * Run with: node test/unit/mev-modules.test.js
 */

const assert = require('assert');

// ============================================================
// FlashbotsProvider Tests
// ============================================================
console.log('\n=== FlashbotsProvider Tests ===');

// Import with try/catch since some features may need runtime deps
let FlashbotsProvider, MevDetector, MevType;
try {
  ({ FlashbotsProvider, FLASHBOTS_RELAYS } = require('../../src/mev/flashbots'));
  ({ MevDetector, MevType, KNOWN_MEV_BOTS, SWAP_SIGNATURES } = require('../../src/mev/mev-detector'));
} catch (err) {
  console.log(`Import error: ${err.message}`);
  process.exit(1);
}

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

// --- FlashbotsProvider construction ---

test('should create FlashbotsProvider with default config', () => {
  const provider = new FlashbotsProvider({
    provider: {},
    signer: { getAddress: () => '0x1234', signMessage: () => '0xsig', signTransaction: () => '0xtx' },
  });
  assert.strictEqual(provider.maxBlockNumber, 25);
  assert.strictEqual(provider.retries, 3);
  assert.strictEqual(provider.stats.submitted, 0);
  assert.strictEqual(provider.stats.included, 0);
  assert.strictEqual(provider.stats.failed, 0);
});

test('should accept custom config', () => {
  const provider = new FlashbotsProvider({
    provider: {},
    signer: {},
    relayUrl: 'https://custom-relay.example.com',
    maxBlockNumber: 50,
    retries: 5,
  });
  assert.strictEqual(provider.maxBlockNumber, 50);
  assert.strictEqual(provider.retries, 5);
  assert.strictEqual(provider.relayUrl, 'https://custom-relay.example.com');
});

test('should use correct relay URLs', () => {
  assert.strictEqual(FLASHBOTS_RELAYS.mainnet, 'https://relay.flashbots.net');
  assert.strictEqual(FLASHBOTS_RELAYS.goerli, 'https://relay-goerli.flashbots.net');
  assert.strictEqual(FLASHBOTS_RELAYS.sepolia, 'https://relay-sepolia.flashbots.net');
});

test('should return initial stats correctly', () => {
  const provider = new FlashbotsProvider({ provider: {}, signer: {} });
  const stats = provider.getStats();
  assert.strictEqual(stats.submitted, 0);
  assert.strictEqual(stats.included, 0);
  assert.strictEqual(stats.failed, 0);
  assert.strictEqual(stats.pendingBundles, 0);
  assert.strictEqual(stats.successRate, 'N/A');
});

test('should track pending bundles', () => {
  const provider = new FlashbotsProvider({ provider: {}, signer: {} });
  provider.pendingBundles.set('0xhash1', { hash: '0xhash1' });
  provider.pendingBundles.set('0xhash2', { hash: '0xhash2' });
  assert.strictEqual(provider.pendingBundles.size, 2);
});

test('should update stats on simulate', () => {
  const provider = new FlashbotsProvider({ provider: {}, signer: {} });
  provider.stats.submitted = 10;
  provider.stats.included = 7;
  const stats = provider.getStats();
  assert.strictEqual(stats.successRate, '70.0%');
});

// --- MevDetector construction ---

console.log('\n=== MevDetector Tests ===');

test('should create MevDetector with default config', () => {
  const detector = new MevDetector({
    provider: {},
  });
  assert.strictEqual(detector.isMonitoring, false);
  assert.strictEqual(detector.alertThreshold, 0.01);
  assert.strictEqual(detector.stats.transactionsScanned, 0);
  assert.strictEqual(detector.stats.attacksDetected, 0);
  assert.strictEqual(detector.pendingTxs.size, 0);
});

test('should accept custom config', () => {
  const detector = new MevDetector({
    provider: {},
    alertThreshold: 0.05,
    monitoredAddresses: ['0xabc', '0xdef'],
  });
  assert.strictEqual(detector.alertThreshold, 0.05);
  assert.strictEqual(detector.monitoredAddresses.size, 2);
  assert.ok(detector.monitoredAddresses.has('0xabc'));
});

test('should define all MEV types', () => {
  assert.strictEqual(MevType.FRONT_RUN, 'front_run');
  assert.strictEqual(MevType.BACK_RUN, 'back_run');
  assert.strictEqual(MevType.SANDWICH, 'sandwich');
  assert.strictEqual(MevType.JIT_LIQUIDITY, 'jit_liquidity');
  assert.strictEqual(MevType.ARBITRAGE, 'arbitrage');
  assert.strictEqual(MevType.LIQUIDATION, 'liquidation');
});

test('should define swap signatures', () => {
  assert.strictEqual(SWAP_SIGNATURES['0x38ed1739'], 'swapExactTokensForTokens');
  assert.strictEqual(SWAP_SIGNATURES['0x7ff36ab5'], 'swapExactETHForTokens');
  assert.strictEqual(SWAP_SIGNATURES['0x5c11d795'], 'swapExactTokensForTokensSupportingFeeOnTransferTokens');
  assert.strictEqual(SWAP_SIGNATURES['0x022c0d9f'], 'swap');
});

test('should support event subscription', () => {
  const detector = new MevDetector({ provider: {} });
  let called = false;
  detector.on('mev:detected', (data) => { called = true; });
  detector.emit('mev:detected', { type: 'sandwich' });
  assert.strictEqual(called, true);
});

test('should support multiple event listeners', () => {
  const detector = new MevDetector({ provider: {} });
  const calls = [];
  detector.on('mev:detected', (data) => calls.push('a'));
  detector.on('mev:detected', (data) => calls.push('b'));
  detector.emit('mev:detected', {});
  assert.deepStrictEqual(calls, ['a', 'b']);
});

test('should return initial stats', () => {
  const detector = new MevDetector({ provider: {} });
  const stats = detector.getStats();
  assert.strictEqual(stats.transactionsScanned, 0);
  assert.strictEqual(stats.attacksDetected, 0);
  assert.strictEqual(stats.sandwichAttacks, 0);
  assert.strictEqual(stats.frontRuns, 0);
  assert.strictEqual(stats.pendingTxsTracked, 0);
  assert.strictEqual(stats.detectionRate, 'N/A');
});

test('should track pending transactions', () => {
  const detector = new MevDetector({ provider: {} });
  detector.pendingTxs.set('0xtx1', {
    hash: '0xtx1',
    from: '0xuser',
    to: '0xdex',
    gasPrice: BigInt(1000000000),
    method: 'swapExactTokensForTokens',
    timestamp: Date.now(),
  });
  assert.strictEqual(detector.pendingTxs.size, 1);
});

test('should return recent attacks', () => {
  const detector = new MevDetector({ provider: {} });
  detector.detectedAttacks.push({ type: 'sandwich', tx: '0x1' });
  detector.detectedAttacks.push({ type: 'front_run', tx: '0x2' });
  const attacks = detector.getRecentAttacks(10);
  assert.strictEqual(attacks.length, 2);
  assert.strictEqual(attacks[0].type, 'sandwich');
});

test('should cleanup old pending transactions', () => {
  const detector = new MevDetector({ provider: {} });
  const now = Date.now();
  detector.pendingTxs.set('0xold', { hash: '0xold', timestamp: now - 120000 });
  detector.pendingTxs.set('0xnew', { hash: '0xnew', timestamp: now });
  detector._cleanupPending();
  assert.strictEqual(detector.pendingTxs.size, 1);
  assert.ok(detector.pendingTxs.has('0xnew'));
});

test('should extract tokens from swap calldata gracefully on invalid data', () => {
  const detector = new MevDetector({ provider: {} });
  const result = detector._extractTokensFromSwap('0x38ed1739deadbeef');
  // Should return null for invalid/short calldata
  assert.strictEqual(result, null);
});

test('should estimate price impact', () => {
  const detector = new MevDetector({ provider: {} });
  const tx = { value: BigInt(1e18) };
  const poolState = {
    reserveIn: BigInt(1000e18),
    reserveOut: BigInt(1000e18),
  };
  const impact = detector.estimatePriceImpact(tx, poolState);
  assert.ok(impact > 0, 'Price impact should be positive');
  assert.ok(impact < 1, 'Price impact should be < 100%');
});

test('should return 0 price impact with no pool state', () => {
  const detector = new MevDetector({ provider: {} });
  const impact = detector.estimatePriceImpact({ value: BigInt(1e18) }, null);
  assert.strictEqual(impact, 0);
});

test('should handle known MEV bots set', () => {
  assert.ok(KNOWN_MEV_BOTS instanceof Set);
  assert.ok(KNOWN_MEV_BOTS.has('0x0000000000000000000000000000000000000000'));
});

// --- Summary ---

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed > 0) {
  console.log('\nFailed tests:');
  for (const { name, error } of errors) {
    console.log(`  ✗ ${name}: ${error.message}`);
  }
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
  process.exit(0);
}

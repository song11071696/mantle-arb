/**
 * Tests for SafetyLayer — the most critical component.
 */

const { SafetyLayer } = require('../src/safety');

describe('SafetyLayer', () => {
  let safety;
  const WHITELISTED_ROUTER = '0x1c8Afff8eD1e2A9D7C5c8bF7F6C5e4A2d1B0C9A8';
  const WHITELISTED_TOKEN = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000';
  const UNKNOWN_ROUTER = '0x0000000000000000000000000000000000000001';
  const UNKNOWN_TOKEN = '0x0000000000000000000000000000000000000002';

  beforeEach(() => {
    safety = new SafetyLayer();
  });

  test('should reject trade with unknown router', () => {
    const proposal = {
      router: UNKNOWN_ROUTER,
      tokens: [WHITELISTED_TOKEN],
      estimatedProfitBps: 100,
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Router'))).toBe(true);
  });

  test('should reject trade with unknown token', () => {
    const proposal = {
      router: WHITELISTED_ROUTER,
      tokens: [UNKNOWN_TOKEN],
      estimatedProfitBps: 100,
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Token'))).toBe(true);
  });

  test('should reject trade below profit threshold', () => {
    const proposal = {
      router: WHITELISTED_ROUTER,
      tokens: [WHITELISTED_TOKEN],
      estimatedProfitBps: 10, // below 50 bps threshold
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('profit'))).toBe(true);
  });

  test('should accept valid trade proposal', () => {
    const proposal = {
      router: WHITELISTED_ROUTER,
      tokens: [WHITELISTED_TOKEN],
      estimatedProfitBps: 100,
      slippageBps: 50,
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject trade with excessive slippage', () => {
    const proposal = {
      router: WHITELISTED_ROUTER,
      tokens: [WHITELISTED_TOKEN],
      estimatedProfitBps: 100,
      slippageBps: 200, // exceeds 100 bps max
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Slippage'))).toBe(true);
  });

  test('should handle case-insensitive addresses', () => {
    const proposal = {
      router: WHITELISTED_ROUTER.toLowerCase(),
      tokens: [WHITELISTED_TOKEN.toUpperCase()],
      estimatedProfitBps: 100,
    };
    const result = safety.validateTradeProposal(proposal);
    expect(result.valid).toBe(true);
  });
});

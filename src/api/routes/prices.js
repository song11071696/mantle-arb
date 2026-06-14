/**
 * Prices API Routes
 * Token price feeds, historical data, and comparisons
 */

const express = require('express');
const router = express.Router();

const priceCache = new Map();
const priceHistory = [];

// Seed some default token prices
const defaultPrices = {
  'WETH': { price: 3245.67, change24h: 2.34, dex: 'MerchantMoe' },
  'WMNT': { price: 1.12, change24h: -1.45, dex: 'Agni' },
  'USDC': { price: 1.0001, change24h: 0.01, dex: 'FusionX' },
  'USDT': { price: 0.9999, change24h: -0.01, dex: 'MerchantMoe' },
  'WBTC': { price: 67890.12, change24h: 1.87, dex: 'Agni' },
};

for (const [token, data] of Object.entries(defaultPrices)) {
  priceCache.set(token, { ...data, token, updatedAt: new Date().toISOString() });
}

/**
 * GET /prices - List all tracked token prices
 */
router.get('/', (req, res) => {
  const { tokens } = req.query;
  let prices = Array.from(priceCache.values());

  if (tokens) {
    const tokenList = tokens.split(',').map((t) => t.trim().toUpperCase());
    prices = prices.filter((p) => tokenList.includes(p.token));
  }

  res.json({
    prices,
    total: prices.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /prices/:token - Get price for a specific token
 */
router.get('/:token', (req, res) => {
  const token = req.params.token.toUpperCase();
  const price = priceCache.get(token);

  if (!price) {
    return res.status(404).json({ error: 'Not Found', message: `No price data for ${token}` });
  }

  res.json({ price, timestamp: new Date().toISOString() });
});

/**
 * POST /prices - Update token price (called by price monitor)
 */
router.post('/', (req, res) => {
  const { token, price, dex, source } = req.body;
  if (!token || price === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'token and price are required' });
  }

  const tokenUpper = token.toUpperCase();
  const existing = priceCache.get(tokenUpper);
  const priceNum = parseFloat(price);

  const priceData = {
    token: tokenUpper,
    price: priceNum,
    previousPrice: existing ? existing.price : null,
    change24h: existing ? ((priceNum - existing.price) / existing.price * 100).toFixed(2) : 0,
    dex: dex || 'unknown',
    source: source || 'manual',
    updatedAt: new Date().toISOString(),
  };

  priceCache.set(tokenUpper, priceData);
  priceHistory.push(priceData);

  // Keep only last 10000 price updates
  if (priceHistory.length > 10000) {
    priceHistory.splice(0, priceHistory.length - 10000);
  }

  res.status(201).json({ price: priceData, timestamp: new Date().toISOString() });
});

/**
 * GET /prices/:token/history - Get price history for a token
 */
router.get('/:token/history', (req, res) => {
  const token = req.params.token.toUpperCase();
  const { from, to, limit = 100 } = req.query;

  let history = priceHistory.filter((p) => p.token === token);
  if (from) history = history.filter((p) => p.updatedAt >= from);
  if (to) history = history.filter((p) => p.updatedAt <= to);

  history = history.slice(-parseInt(limit));

  res.json({
    token,
    history,
    total: history.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /prices/compare/:pair - Compare prices across DEXes
 */
router.get('/compare/:pair', (req, res) => {
  const pair = req.params.pair.toUpperCase();
  const [base, quote] = pair.split('/');

  const basePrice = priceCache.get(base);
  const quotePrice = priceCache.get(quote);

  if (!basePrice || !quotePrice) {
    return res.status(404).json({ error: 'Not Found', message: `Insufficient price data for ${pair}` });
  }

  res.json({
    pair,
    prices: { base: basePrice, quote: quotePrice },
    spread: '0.00%',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

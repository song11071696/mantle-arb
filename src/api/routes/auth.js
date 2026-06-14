/**
 * Auth API Routes
 * Login, token management, and API key operations
 */

const express = require('express');
const router = express.Router();
const { generateToken, hashKey, API_KEYS } = require('../middleware/auth');

const users = new Map();
users.set('admin', {
  id: 'admin',
  username: 'admin',
  passwordHash: hashKey('admin123'), // In prod, use bcrypt
  role: 'admin',
  permissions: ['read', 'write', 'admin'],
});

/**
 * POST /auth/login - Authenticate and receive a token
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'username and password are required' });
  }

  const user = users.get(username);
  if (!user || user.passwordHash !== hashKey(password)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
    expiresIn: '24h',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /auth/verify - Verify a token
 */
router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Bad Request', message: 'token is required' });
  }

  const { verifyToken } = require('../middleware/auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
  }

  res.json({
    valid: true,
    user: { id: payload.id, username: payload.username, role: payload.role },
    expiresAt: new Date(payload.exp).toISOString(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /auth/api-keys - Generate a new API key
 */
router.post('/api-keys', (req, res) => {
  const { name, permissions } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Bad Request', message: 'name is required' });
  }

  const crypto = require('crypto');
  const apiKey = `mab_${crypto.randomBytes(24).toString('hex')}`;
  const hashed = hashKey(apiKey);

  API_KEYS.set(hashed, {
    name,
    permissions: permissions || ['read'],
    createdAt: new Date(),
    lastUsed: null,
  });

  res.status(201).json({
    apiKey,
    name,
    permissions: permissions || ['read'],
    message: 'Store this key securely - it will not be shown again',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /auth/api-keys - List API key metadata (no secrets)
 */
router.get('/api-keys', (req, res) => {
  const keys = Array.from(API_KEYS.entries()).map(([hash, info]) => ({
    hashPrefix: hash.slice(0, 8) + '...',
    name: info.name,
    permissions: info.permissions,
    createdAt: info.createdAt,
    lastUsed: info.lastUsed,
  }));

  res.json({ keys, total: keys.length, timestamp: new Date().toISOString() });
});

/**
 * DELETE /auth/api-keys/:hashPrefix - Revoke an API key
 */
router.delete('/api-keys/:hashPrefix', (req, res) => {
  const prefix = req.params.hashPrefix;
  let revoked = false;

  for (const [hash, info] of API_KEYS.entries()) {
    if (hash.startsWith(prefix)) {
      API_KEYS.delete(hash);
      revoked = true;
      break;
    }
  }

  if (!revoked) {
    return res.status(404).json({ error: 'Not Found', message: 'API key not found' });
  }

  res.json({ message: 'API key revoked', timestamp: new Date().toISOString() });
});

module.exports = router;

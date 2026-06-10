/**
 * Authentication Middleware
 * Validates API keys and JWT tokens for protected endpoints
 */

const crypto = require('crypto');

// In-memory API key store (replace with DB in production)
const API_KEYS = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'mantle-arb-dev-secret-change-in-prod';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize default API keys from environment
 */
function initializeDefaultKeys() {
  const defaultKey = process.env.API_KEY || 'mantle-arb-default-key';
  if (defaultKey) {
    API_KEYS.set(hashKey(defaultKey), {
      name: 'default',
      permissions: ['read', 'write'],
      createdAt: new Date(),
      lastUsed: null,
    });
  }
}

/**
 * Hash an API key for safe storage
 */
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a simple JWT-like token (use jsonwebtoken in production)
 */
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY,
  })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verify and decode a token
 */
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Main authentication middleware
 * Checks Authorization header for Bearer token or API key
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
  }

  // Bearer token auth
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
    req.user = payload;
    return next();
  }

  // API key auth
  if (authHeader.startsWith('ApiKey ')) {
    const key = authHeader.slice(7);
    const hashed = hashKey(key);
    const keyInfo = API_KEYS.get(hashed);
    if (!keyInfo) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }
    keyInfo.lastUsed = new Date();
    req.user = { name: keyInfo.name, permissions: keyInfo.permissions };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid Authorization format. Use Bearer <token> or ApiKey <key>',
  });
}

/**
 * Permission check middleware factory
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
    }
    next();
  };
}

initializeDefaultKeys();

module.exports = {
  authMiddleware,
  requirePermission,
  generateToken,
  verifyToken,
  hashKey,
  API_KEYS,
};

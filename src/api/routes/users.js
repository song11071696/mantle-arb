/**
 * Users API Routes
 * User management and profile operations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const users = new Map();
let userCounter = 0;

// Seed a default admin user
users.set('admin', {
  id: 'admin',
  username: 'admin',
  email: 'admin@mantle-arb.io',
  role: 'admin',
  permissions: ['read', 'write', 'admin'],
  settings: { notifications: true, theme: 'dark', timezone: 'UTC' },
  createdAt: new Date().toISOString(),
  lastLoginAt: null,
});

/**
 * GET /users - List all users
 */
router.get('/', (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  let result = Array.from(users.values());

  if (role) result = result.filter((u) => u.role === role);

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const start = (pageNum - 1) * pageSize;

  res.json({
    users: result.slice(start, start + pageSize).map((u) => ({ ...u, email: undefined })),
    pagination: { page: pageNum, limit: pageSize, total: result.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /users - Create a new user
 */
router.post('/', (req, res) => {
  const { username, email, role, settings } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Bad Request', message: 'username and email are required' });
  }
  if (users.has(username)) {
    return res.status(409).json({ error: 'Conflict', message: `User ${username} already exists` });
  }

  const user = {
    id: `USR-${String(++userCounter).padStart(6, '0')}`,
    username,
    email,
    role: role || 'viewer',
    permissions: role === 'admin' ? ['read', 'write', 'admin'] : ['read'],
    settings: settings || { notifications: true, theme: 'dark', timezone: 'UTC' },
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  users.set(username, user);
  res.status(201).json({ user, timestamp: new Date().toISOString() });
});

/**
 * GET /users/:id - Get user by ID or username
 */
router.get('/:id', (req, res) => {
  const user = Array.from(users.values()).find(
    (u) => u.id === req.params.id || u.username === req.params.id
  );
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: `User ${req.params.id} not found` });
  }
  res.json({ user, timestamp: new Date().toISOString() });
});

/**
 * PUT /users/:id - Update user profile
 */
router.put('/:id', (req, res) => {
  const user = Array.from(users.values()).find(
    (u) => u.id === req.params.id || u.username === req.params.id
  );
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: `User ${req.params.id} not found` });
  }

  const { email, role, settings } = req.body;
  if (email) user.email = email;
  if (role) user.role = role;
  if (settings) user.settings = { ...user.settings, ...settings };
  user.updatedAt = new Date().toISOString();

  res.json({ user, timestamp: new Date().toISOString() });
});

/**
 * DELETE /users/:id - Delete a user
 */
router.delete('/:id', (req, res) => {
  const user = Array.from(users.values()).find(
    (u) => u.id === req.params.id || u.username === req.params.id
  );
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: `User ${req.params.id} not found` });
  }
  users.delete(user.username);
  res.json({ message: `User ${user.username} deleted`, id: user.id });
});

module.exports = router;

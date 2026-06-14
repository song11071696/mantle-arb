/**
 * Contract API Routes
 * Smart contract interaction, deployment, and monitoring
 */

const express = require('express');
const router = express.Router();

const contracts = new Map();
let contractCounter = 0;

// Seed known contracts
contracts.set('router-merchantmoe', {
  id: 'CTR-000001',
  name: 'MerchantMoe Router',
  address: '0x0000000000000000000000000000000000000001',
  type: 'router',
  network: 'mantle',
  chainId: 5000,
  abi: 'loaded',
  status: 'active',
  createdAt: new Date().toISOString(),
});

contracts.set('router-agni', {
  id: 'CTR-000002',
  name: 'Agni Router',
  address: '0x0000000000000000000000000000000000000002',
  type: 'router',
  network: 'mantle',
  chainId: 5000,
  abi: 'loaded',
  status: 'active',
  createdAt: new Date().toISOString(),
});

/**
 * GET /contract - List all tracked contracts
 */
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(contracts.values());

  if (type) result = result.filter((c) => c.type === type);
  if (status) result = result.filter((c) => c.status === status);

  res.json({
    contracts: result,
    total: result.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /contract - Register a new contract
 */
router.post('/', (req, res) => {
  const { name, address, type, network, chainId } = req.body;
  if (!name || !address || !type) {
    return res.status(400).json({ error: 'Bad Request', message: 'name, address, and type are required' });
  }

  const contract = {
    id: `CTR-${String(++contractCounter).padStart(6, '0')}`,
    name,
    address,
    type,
    network: network || 'mantle',
    chainId: chainId || 5000,
    abi: 'pending',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  contracts.set(contract.id, contract);
  res.status(201).json({ contract, timestamp: new Date().toISOString() });
});

/**
 * GET /contract/:id - Get contract by ID or name
 */
router.get('/:id', (req, res) => {
  const contract = contracts.get(req.params.id) ||
    Array.from(contracts.values()).find((c) => c.id === req.params.id || c.address === req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Not Found', message: `Contract ${req.params.id} not found` });
  }
  res.json({ contract, timestamp: new Date().toISOString() });
});

/**
 * POST /contract/:id/call - Execute a read-only contract call
 */
router.post('/:id/call', (req, res) => {
  const contract = contracts.get(req.params.id) ||
    Array.from(contracts.values()).find((c) => c.id === req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Not Found', message: `Contract ${req.params.id} not found` });
  }

  const { method, params } = req.body;
  if (!method) {
    return res.status(400).json({ error: 'Bad Request', message: 'method is required' });
  }

  res.json({
    contract: contract.id,
    method,
    params: params || [],
    result: null,
    message: 'Contract call requires blockchain connection',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /contract/:id/events - Get contract events
 */
router.get('/:id/events', (req, res) => {
  const contract = contracts.get(req.params.id) ||
    Array.from(contracts.values()).find((c) => c.id === req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Not Found', message: `Contract ${req.params.id} not found` });
  }

  const { event, fromBlock, toBlock, limit = 50 } = req.query;

  res.json({
    contract: contract.id,
    events: [],
    filters: { event, fromBlock, toBlock },
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /contract/:id - Remove a tracked contract
 */
router.delete('/:id', (req, res) => {
  if (!contracts.has(req.params.id)) {
    return res.status(404).json({ error: 'Not Found', message: `Contract ${req.params.id} not found` });
  }
  contracts.delete(req.params.id);
  res.json({ message: `Contract ${req.params.id} removed`, id: req.params.id });
});

module.exports = router;

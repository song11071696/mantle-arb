/**
 * WebSocket Server
 * Real-time event broadcasting for trades, prices, and alerts
 */

const { WebSocketServer } = require('ws');

let wss = null;

/**
 * Create and initialize the WebSocket server
 * @param {http.Server} server - HTTP server to attach to
 * @returns {WebSocketServer}
 */
function createWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);

    ws.isAlive = true;
    ws.subscriptions = new Set();

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'subscribe' && msg.channel) {
          ws.subscriptions.add(msg.channel);
          ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
        } else if (msg.type === 'unsubscribe' && msg.channel) {
          ws.subscriptions.delete(msg.channel);
          ws.send(JSON.stringify({ type: 'unsubscribed', channel: msg.channel }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to MantleArb WebSocket',
      timestamp: new Date().toISOString(),
    }));
  });

  // Heartbeat interval
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

/**
 * Broadcast a message to all connected clients (optionally filtered by channel)
 */
function broadcast(event, data, channel) {
  if (!wss) return;
  const message = JSON.stringify({ type: event, data, channel, timestamp: new Date().toISOString() });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1 && (!channel || ws.subscriptions.has(channel))) {
      ws.send(message);
    }
  });
}

module.exports = { createWebSocketServer, broadcast };

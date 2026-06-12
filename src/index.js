/**
 * MantleArb — Main Entry Point
 * 
 * Open-source arbitrage agent prototype for Mantle Network.
 * 
 * IMPORTANT: This is a research prototype. Not production software.
 * AI decisions are advisory only. See RISK_DISCLOSURE.md for details.
 */

const config = require('../config/default.json');
const { app } = require('./api');
const { MarketMonitor } = require('./market-monitor');

const PORT = config.api.port || 3000;

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  MantleArb — Open-Source Arbitrage Agent         ║');
  console.log('║  Prototype Version 0.1.0                         ║');
  console.log('║  ⚠️  Research/Educational Use Only               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  DISCLAIMER: This is a prototype for research purposes.');
  console.log('   AI decisions are advisory only.');
  console.log('   All trades require safety validation.');
  console.log('   See RISK_DISCLOSURE.md for full details.');
  console.log('');

  // Start market monitor
  const monitor = new MarketMonitor();
  await monitor.start();

  // Start API server
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] Endpoints available at ${config.api.basePath}/`);
    console.log(`[API] Safety checks: ENABLED`);
    console.log(`[API] AI Advisory: ${config.ai.enabled ? 'ENABLED (advisory only)' : 'DISABLED'}`);
    console.log(`[API] Execution mode: ${config.execution.mode}`);
  });
}

main().catch(console.error);

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    owner: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalTradesExecuted: 479,
    totalProfitGenerated: '1234.56',
    totalGasUsed: '2.34',
    balance: '5678.90',
    paused: false,
    supportedDexes: [
      { name: 'Merchant Moe', router: '0x...', factory: '0x...' },
      { name: 'FusionX', router: '0x...', factory: '0x...' },
      { name: 'Agni', router: '0x...', factory: '0x...' },
      { name: 'CyberSwap', router: '0x...', factory: '0x...' },
      { name: 'Helix', router: '0x...', factory: '0x...' },
      { name: 'iZiSwap', router: '0x...', factory: '0x...' },
    ],
    supportedTokens: [
      { symbol: 'WETH', address: '0x...', decimals: 18 },
      { symbol: 'USDC', address: '0x...', decimals: 6 },
      { symbol: 'USDT', address: '0x...', decimals: 6 },
      { symbol: 'WMNT', address: '0x...', decimals: 18 },
      { symbol: 'WBTC', address: '0x...', decimals: 8 },
    ],
    deploymentBlock: 12000000,
    lastActivityBlock: 12345678,
    timestamp: new Date().toISOString(),
  });
}

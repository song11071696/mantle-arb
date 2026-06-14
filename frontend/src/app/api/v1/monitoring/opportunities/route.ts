import { NextResponse } from 'next/server';

export async function GET() {
  const opportunities = [
    {
      id: 'OPP001',
      tokenA: { symbol: 'WETH', address: '0x...' },
      tokenB: { symbol: 'USDC', address: '0x...' },
      buyDex: { id: 'agni', name: 'Agni' },
      sellDex: { id: 'fusionx', name: 'FusionX' },
      amountIn: '1.5',
      expectedProfit: '0.0234',
      profitBps: 45,
      gasCost: 12,
      netProfit: 0.0234,
      status: 'hot',
      timestamp: Date.now() - 2000,
    },
    {
      id: 'OPP002',
      tokenA: { symbol: 'WMNT', address: '0x...' },
      tokenB: { symbol: 'USDT', address: '0x...' },
      buyDex: { id: 'merchant-moe', name: 'Merchant Moe' },
      sellDex: { id: 'cyberswap', name: 'CyberSwap' },
      amountIn: '1000',
      expectedProfit: '0.0156',
      profitBps: 31,
      gasCost: 8,
      netProfit: 0.0156,
      status: 'warm',
      timestamp: Date.now() - 5000,
    },
    {
      id: 'OPP003',
      tokenA: { symbol: 'WBTC', address: '0x...' },
      tokenB: { symbol: 'WETH', address: '0x...' },
      buyDex: { id: 'helix', name: 'Helix' },
      sellDex: { id: 'iziswap', name: 'iZiSwap' },
      amountIn: '0.1',
      expectedProfit: '0.0045',
      profitBps: 12,
      gasCost: 15,
      netProfit: 0.0045,
      status: 'expired',
      timestamp: Date.now() - 15000,
    },
  ];

  return NextResponse.json(opportunities);
}

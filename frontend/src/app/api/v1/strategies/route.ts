import { NextResponse } from 'next/server';

const mockStrategies = [
  {
    id: '1',
    name: 'Triangular Arbitrage',
    description: 'Exploit price differences in A→B→C→A token cycles across multiple DEXes',
    type: 'triangular',
    status: 'active',
    parameters: {
      minProfitBps: 30,
      maxSlippageBps: 50,
      maxTradeSize: 5000,
      pairs: ['WETH/USDC/WMNT'],
    },
    stats: {
      totalTrades: 234,
      successfulTrades: 169,
      failedTrades: 65,
      totalProfit: '156.78',
      totalLosses: '23.45',
      netProfit: '133.33',
      winRate: 72.3,
      avgProfitPerTrade: '0.67',
      maxDrawdown: 5.2,
      sharpeRatio: 2.34,
      lastTradeTimestamp: Date.now() - 120000,
    },
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 60000,
  },
  {
    id: '2',
    name: 'Cross-DEX Spread',
    description: 'Buy low on one DEX, sell high on another for the same pair',
    type: 'cross-dex',
    status: 'active',
    parameters: {
      minProfitBps: 20,
      maxSlippageBps: 80,
      maxTradeSize: 10000,
      pairs: ['WETH/USDC', 'WMNT/USDT', 'WBTC/WETH'],
    },
    stats: {
      totalTrades: 156,
      successfulTrades: 106,
      failedTrades: 50,
      totalProfit: '89.45',
      totalLosses: '12.30',
      netProfit: '77.15',
      winRate: 68.1,
      avgProfitPerTrade: '0.57',
      maxDrawdown: 3.8,
      sharpeRatio: 1.89,
      lastTradeTimestamp: Date.now() - 300000,
    },
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 120000,
  },
  {
    id: '3',
    name: 'Flash Loan Arbitrage',
    description: 'Zero-capital arbitrage using Balancer/Aave flash loans',
    type: 'flash-loan',
    status: 'paused',
    parameters: {
      minProfitBps: 50,
      maxSlippageBps: 30,
      maxTradeSize: 100000,
      flashLoanProvider: 'balancer',
    },
    stats: {
      totalTrades: 89,
      successfulTrades: 72,
      failedTrades: 17,
      totalProfit: '234.56',
      totalLosses: '8.90',
      netProfit: '225.66',
      winRate: 81.5,
      avgProfitPerTrade: '2.63',
      maxDrawdown: 8.1,
      sharpeRatio: 3.12,
      lastTradeTimestamp: Date.now() - 3600000,
    },
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: '4',
    name: 'Statistical Arbitrage',
    description: 'Mean-reversion pairs trading using z-score analysis',
    type: 'statistical',
    status: 'stopped',
    parameters: {
      zScoreThreshold: 2.0,
      lookbackPeriod: 100,
      maxTradeSize: 3000,
    },
    stats: {
      totalTrades: 45,
      successfulTrades: 25,
      failedTrades: 20,
      totalProfit: '5.67',
      totalLosses: '18.01',
      netProfit: '-12.34',
      winRate: 55.6,
      avgProfitPerTrade: '-0.27',
      maxDrawdown: 15.3,
      sharpeRatio: -0.45,
      lastTradeTimestamp: Date.now() - 86400000,
    },
    createdAt: Date.now() - 86400000 * 45,
    updatedAt: Date.now() - 86400000,
  },
];

export async function GET() {
  return NextResponse.json(mockStrategies);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newStrategy = {
    id: String(mockStrategies.length + 1),
    ...body,
    status: 'active',
    stats: {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: '0',
      totalLosses: '0',
      netProfit: '0',
      winRate: 0,
      avgProfitPerTrade: '0',
      maxDrawdown: 0,
      sharpeRatio: 0,
      lastTradeTimestamp: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return NextResponse.json(newStrategy, { status: 201 });
}

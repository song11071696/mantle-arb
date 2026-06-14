import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const config = await request.json();
  
  // Simulate backtest result
  const result = {
    id: `BT-${Date.now()}`,
    config,
    totalProfit: 1234.56 + Math.random() * 500,
    maxDrawdown: -(3 + Math.random() * 10),
    sharpeRatio: 1.5 + Math.random() * 2,
    winRate: 60 + Math.random() * 25,
    totalTrades: Math.floor(200 + Math.random() * 500),
    avgProfit: 1.5 + Math.random() * 3,
    equityCurve: Array.from({ length: 120 }, (_, i) => ({
      time: `W${i}`,
      value: 10000 + Math.random() * 2000 + i * 50 + (Math.random() > 0.9 ? -200 : 0),
    })),
    trades: [],
    createdAt: Date.now(),
  };

  return NextResponse.json(result, { status: 201 });
}

export async function GET() {
  const results = [
    {
      id: 'BT-001',
      config: { strategyId: 'triangular', startDate: '2026-01-01', endDate: '2026-05-31', initialCapital: 10000 },
      totalProfit: 1234.56,
      maxDrawdown: -5.2,
      sharpeRatio: 2.34,
      winRate: 72.3,
      totalTrades: 567,
      avgProfit: 2.18,
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'BT-002',
      config: { strategyId: 'cross-dex', startDate: '2026-01-01', endDate: '2026-05-31', initialCapital: 10000 },
      totalProfit: 987.65,
      maxDrawdown: -3.8,
      sharpeRatio: 1.89,
      winRate: 68.1,
      totalTrades: 423,
      avgProfit: 2.33,
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'BT-003',
      config: { strategyId: 'flash-loan', startDate: '2026-01-01', endDate: '2026-05-31', initialCapital: 10000 },
      totalProfit: 2345.67,
      maxDrawdown: -8.1,
      sharpeRatio: 3.12,
      winRate: 81.5,
      totalTrades: 189,
      avgProfit: 12.41,
      createdAt: Date.now() - 86400000 * 3,
    },
  ];

  return NextResponse.json(results);
}

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    maxTradeSize: 10000,
    minProfitBps: 50,
    maxSlippageBps: 100,
    dailyTradeLimit: 100,
    maxFlashLoanSize: 100000,
    maxPriceDeviationBps: 500,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    ...body,
    updatedAt: Date.now(),
  });
}

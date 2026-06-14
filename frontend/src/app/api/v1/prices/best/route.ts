import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenIn = searchParams.get('tokenIn') || 'WETH';
  const tokenOut = searchParams.get('tokenOut') || 'USDC';
  const amount = searchParams.get('amount') || '1';

  return NextResponse.json({
    tokenIn,
    tokenOut,
    amountIn: amount,
    bestDex: 'FusionX',
    amountOut: (parseFloat(amount) * 3845.12).toFixed(2),
    price: 3845.12,
    gasEstimate: 115000,
    alternatives: [
      { dex: 'Merchant Moe', amountOut: (parseFloat(amount) * 3842.50).toFixed(2), price: 3842.50 },
      { dex: 'Helix', amountOut: (parseFloat(amount) * 3843.90).toFixed(2), price: 3843.90 },
      { dex: 'CyberSwap', amountOut: (parseFloat(amount) * 3841.20).toFixed(2), price: 3841.20 },
    ],
    timestamp: Date.now(),
  });
}

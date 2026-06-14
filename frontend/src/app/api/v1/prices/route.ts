import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenIn = searchParams.get('tokenIn');
  const tokenOut = searchParams.get('tokenOut');

  const allPrices = [
    {
      dex: 'Merchant Moe',
      dexId: 'merchant-moe',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3842.50,
      amountOut: '3842.50',
      liquidity: '12500000',
      gasEstimate: 120000,
      timestamp: Date.now(),
    },
    {
      dex: 'FusionX',
      dexId: 'fusionx',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3845.12,
      amountOut: '3845.12',
      liquidity: '8900000',
      gasEstimate: 115000,
      timestamp: Date.now(),
    },
    {
      dex: 'Agni',
      dexId: 'agni',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3839.80,
      amountOut: '3839.80',
      liquidity: '6700000',
      gasEstimate: 130000,
      timestamp: Date.now(),
    },
    {
      dex: 'CyberSwap',
      dexId: 'cyberswap',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3841.20,
      amountOut: '3841.20',
      liquidity: '4500000',
      gasEstimate: 125000,
      timestamp: Date.now(),
    },
    {
      dex: 'Helix',
      dexId: 'helix',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3843.90,
      amountOut: '3843.90',
      liquidity: '5600000',
      gasEstimate: 118000,
      timestamp: Date.now(),
    },
    {
      dex: 'iZiSwap',
      dexId: 'iziswap',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      price: 3840.15,
      amountOut: '3840.15',
      liquidity: '3200000',
      gasEstimate: 135000,
      timestamp: Date.now(),
    },
  ];

  let filtered = allPrices;
  if (tokenIn) filtered = filtered.filter((p) => p.tokenIn === tokenIn);
  if (tokenOut) filtered = filtered.filter((p) => p.tokenOut === tokenOut);

  return NextResponse.json(filtered);
}

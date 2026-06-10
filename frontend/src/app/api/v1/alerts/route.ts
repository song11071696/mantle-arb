import { NextResponse } from 'next/server';

export async function GET() {
  const alerts = [
    {
      id: 'ALT001',
      type: 'opportunity',
      severity: 'high',
      title: 'High Spread Detected',
      message: 'WETH/USDC spread 0.65% between Merchant Moe and FusionX',
      read: false,
      timestamp: Date.now() - 120000,
    },
    {
      id: 'ALT002',
      type: 'risk',
      severity: 'critical',
      title: 'Daily Limit Warning',
      message: 'Approaching daily trade limit (85/100 trades today)',
      read: false,
      timestamp: Date.now() - 300000,
    },
    {
      id: 'ALT003',
      type: 'trade',
      severity: 'success',
      title: 'Trade Completed',
      message: 'TX003: +0.0456 MNT profit on WBTC/WETH via Flash Loan',
      read: true,
      timestamp: Date.now() - 480000,
    },
    {
      id: 'ALT004',
      type: 'system',
      severity: 'warning',
      title: 'High Gas Price',
      message: 'Current gas price 45 gwei exceeds threshold of 30 gwei',
      read: true,
      timestamp: Date.now() - 720000,
    },
    {
      id: 'ALT005',
      type: 'trade',
      severity: 'error',
      title: 'Trade Failed',
      message: 'TX008: Slippage exceeded 1% threshold on WETH/USDT',
      read: true,
      timestamp: Date.now() - 900000,
    },
  ];

  return NextResponse.json(alerts);
}

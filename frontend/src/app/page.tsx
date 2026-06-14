'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatCard, StrategyCard, TradeCard } from '@/components/ui/Cards';
import { PriceFeed } from '@/components/ui/PriceFeed';
import { LiveMonitor } from '@/components/ui/LiveMonitor';
import { MiniChart } from '@/components/ui/Charts';

const mockPrices = [
  { token: 'WETH', symbol: 'WETH', price: 3842.5, change24h: 2.3, dex: 'Merchant Moe' },
  { token: 'USDC', symbol: 'USDC', price: 1.0001, change24h: 0.01, dex: 'FusionX' },
  { token: 'WMNT', symbol: 'WMNT', price: 1.234, change24h: -1.2, dex: 'Agni' },
  { token: 'WBTC', symbol: 'WBTC', price: 104523.67, change24h: 1.8, dex: 'CyberSwap' },
  { token: 'USDT', symbol: 'USDT', price: 0.9999, change24h: -0.02, dex: 'Helix' },
];

const mockOpportunities = [
  {
    id: '1',
    pair: 'WETH/USDC',
    buyDex: 'Merchant Moe',
    sellDex: 'FusionX',
    spread: 0.45,
    estimatedProfit: 0.0234,
    gasEstimate: 12,
    timestamp: '2s ago',
    status: 'hot' as const,
  },
  {
    id: '2',
    pair: 'WMNT/USDT',
    buyDex: 'Agni',
    sellDex: 'CyberSwap',
    spread: 0.31,
    estimatedProfit: 0.0156,
    gasEstimate: 8,
    timestamp: '5s ago',
    status: 'warm' as const,
  },
  {
    id: '3',
    pair: 'WBTC/WETH',
    buyDex: 'Helix',
    sellDex: 'iZiSwap',
    spread: 0.12,
    estimatedProfit: 0.0045,
    gasEstimate: 15,
    timestamp: '15s ago',
    status: 'expired' as const,
  },
];

const mockStrategies = [
  {
    id: '1',
    name: 'Triangular Arb',
    description: 'A→B→C→A cycle arbitrage across DEXes',
    status: 'active' as const,
    profit: 156.78,
    trades: 234,
    winRate: 72.3,
    type: 'Triangular',
  },
  {
    id: '2',
    name: 'Cross-DEX Spread',
    description: 'Exploit price differences between DEXes',
    status: 'active' as const,
    profit: 89.45,
    trades: 156,
    winRate: 68.1,
    type: 'Cross-DEX',
  },
  {
    id: '3',
    name: 'Flash Loan Arb',
    description: 'Zero-capital arbitrage using flash loans',
    status: 'paused' as const,
    profit: 234.56,
    trades: 89,
    winRate: 81.5,
    type: 'Flash Loan',
  },
];

const mockRecentTrades = [
  { id: '1', pair: 'WETH/USDC', type: 'buy' as const, amount: 1.5, price: 3842.5, profit: 0.0234, timestamp: '2 min ago', status: 'completed' as const, dex: 'Merchant Moe' },
  { id: '2', pair: 'WMNT/USDT', type: 'sell' as const, amount: 1000, price: 1.234, profit: -0.0012, timestamp: '5 min ago', status: 'completed' as const, dex: 'FusionX' },
  { id: '3', pair: 'WBTC/WETH', type: 'buy' as const, amount: 0.1, price: 104523.67, profit: 0.0456, timestamp: '8 min ago', status: 'completed' as const, dex: 'Agni' },
  { id: '4', pair: 'WETH/USDC', type: 'sell' as const, amount: 2.0, price: 3845.12, profit: 0.0189, timestamp: '12 min ago', status: 'pending' as const, dex: 'CyberSwap' },
];

const chartData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 100 + Math.random() * 50 + i * 2,
}));

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Dashboard" subtitle="Real-time arbitrage overview" />
        <main className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Profit"
              value="1,234.56 MNT"
              change="+12.5% today"
              changeType="positive"
              icon={
                <svg className="w-6 h-6 text-mantle-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Active Strategies"
              value="3"
              change="2 running, 1 paused"
              changeType="neutral"
              icon={
                <svg className="w-6 h-6 text-mantle-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
            <StatCard
              title="Today's Trades"
              value="47"
              change="+8 from yesterday"
              changeType="positive"
              icon={
                <svg className="w-6 h-6 text-mantle-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatCard
              title="Win Rate"
              value="73.2%"
              change="+2.1% this week"
              changeType="positive"
              icon={
                <svg className="w-6 h-6 text-mantle-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profit Chart */}
            <div className="lg:col-span-2">
              <MiniChart data={chartData} title="Profit Over Time (24h)" height={250} color="#22c55e" />
            </div>

            {/* Price Feed */}
            <div>
              <PriceFeed prices={mockPrices} />
            </div>
          </div>

          {/* Strategies & Live Monitor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Strategies</h2>
              <div className="space-y-4">
                {mockStrategies.map((s) => (
                  <StrategyCard key={s.id} strategy={s} />
                ))}
              </div>
            </div>
            <div>
              <LiveMonitor opportunities={mockOpportunities} />
            </div>
          </div>

          {/* Recent Trades */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Trades</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockRecentTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

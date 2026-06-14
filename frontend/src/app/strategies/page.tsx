'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StrategyCard } from '@/components/ui/Cards';

const allStrategies = [
  {
    id: '1',
    name: 'Triangular Arbitrage',
    description: 'Exploit price differences in A→B→C→A token cycles across multiple DEXes',
    status: 'active' as const,
    profit: 156.78,
    trades: 234,
    winRate: 72.3,
    type: 'Triangular',
  },
  {
    id: '2',
    name: 'Cross-DEX Spread',
    description: 'Buy low on one DEX, sell high on another for the same pair',
    status: 'active' as const,
    profit: 89.45,
    trades: 156,
    winRate: 68.1,
    type: 'Cross-DEX',
  },
  {
    id: '3',
    name: 'Flash Loan Arbitrage',
    description: 'Zero-capital arbitrage using Balancer/Aave flash loans',
    status: 'paused' as const,
    profit: 234.56,
    trades: 89,
    winRate: 81.5,
    type: 'Flash Loan',
  },
  {
    id: '4',
    name: 'Statistical Arbitrage',
    description: 'Mean-reversion pairs trading using z-score analysis',
    status: 'stopped' as const,
    profit: -12.34,
    trades: 45,
    winRate: 55.6,
    type: 'Statistical',
  },
  {
    id: '5',
    name: 'Momentum Scalper',
    description: 'Short-term momentum trades on high-volume pairs',
    status: 'active' as const,
    profit: 67.89,
    trades: 312,
    winRate: 61.2,
    type: 'Momentum',
  },
  {
    id: '6',
    name: 'Liquidation Hunter',
    description: 'Monitor and profit from undercollateralized liquidations',
    status: 'paused' as const,
    profit: 445.67,
    trades: 23,
    winRate: 91.3,
    type: 'Liquidation',
  },
];

export default function StrategiesPage() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? allStrategies
    : allStrategies.filter(s => s.status === filter);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Strategy Management" subtitle="Configure and monitor trading strategies" />
        <main className="p-6">
          {/* Filter Bar */}
          <div className="flex items-center space-x-4 mb-6">
            {['all', 'active', 'paused', 'stopped'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-mantle-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-2 text-xs opacity-75">
                  ({f === 'all' ? allStrategies.length : allStrategies.filter(s => s.status === f).length})
                </span>
              </button>
            ))}
          </div>

          {/* Strategy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </div>

          {/* Create Strategy CTA */}
          <div className="mt-8 p-8 bg-gradient-to-r from-mantle-500 to-mantle-700 rounded-xl text-white">
            <h3 className="text-xl font-bold">Create New Strategy</h3>
            <p className="mt-2 text-mantle-100">
              Design custom arbitrage strategies with our visual builder or code your own.
            </p>
            <button className="mt-4 px-6 py-2.5 bg-white text-mantle-700 rounded-lg font-medium hover:bg-mantle-50 transition-colors">
              + New Strategy
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

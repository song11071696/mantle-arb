'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MiniChart } from '@/components/ui/Charts';

const profitData = Array.from({ length: 30 }, (_, i) => ({
  time: `Day ${i + 1}`,
  value: 100 + Math.random() * 30 + i * 5,
}));

const tradesData = Array.from({ length: 30 }, (_, i) => ({
  time: `Day ${i + 1}`,
  value: 10 + Math.floor(Math.random() * 20),
}));

const winRateData = Array.from({ length: 30 }, (_, i) => ({
  time: `Day ${i + 1}`,
  value: 60 + Math.random() * 20,
}));

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Analytics" subtitle="Performance metrics and insights" />
        <main className="p-6 space-y-6">
          {/* Period Selector */}
          <div className="flex items-center space-x-4">
            {['24h', '7d', '30d', '90d', 'All'].map(period => (
              <button key={period} className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period === '30d' ? 'bg-mantle-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}>
                {period}
              </button>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniChart data={profitData} title="Cumulative Profit (MNT)" height={250} color="#22c55e" />
            <MiniChart data={tradesData} title="Daily Trade Count" height={250} color="#0ea5e9" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniChart data={winRateData} title="Win Rate (%)" height={250} color="#8b5cf6" />
            
            {/* Strategy Performance Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategy Performance</h3>
              <div className="space-y-4">
                {[
                  { name: 'Cross-DEX Spread', profit: 89.45, trades: 156, winRate: 68.1, color: 'bg-mantle-500' },
                  { name: 'Triangular Arb', profit: 156.78, trades: 234, winRate: 72.3, color: 'bg-profit-500' },
                  { name: 'Flash Loan', profit: 234.56, trades: 89, winRate: 81.5, color: 'bg-purple-500' },
                  { name: 'Statistical', profit: -12.34, trades: 45, winRate: 55.6, color: 'bg-loss-500' },
                ].map(s => (
                  <div key={s.name} className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
                        <span className={`text-sm font-bold ${s.profit >= 0 ? 'text-profit-600' : 'text-loss-600'}`}>
                          {s.profit >= 0 ? '+' : ''}{s.profit.toFixed(2)} MNT
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${Math.min(100, Math.abs(s.profit) / 2.5)}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-400">{s.trades} trades</span>
                        <span className="text-xs text-slate-400">{s.winRate}% win rate</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Pairs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performing Pairs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { pair: 'WETH/USDC', profit: 234.56, trades: 189, spread: '0.32%' },
                { pair: 'WBTC/WETH', profit: 189.23, trades: 67, spread: '0.28%' },
                { pair: 'WMNT/USDT', profit: 145.67, trades: 123, spread: '0.41%' },
                { pair: 'USDC/USDT', profit: 98.34, trades: 234, spread: '0.12%' },
              ].map(p => (
                <div key={p.pair} className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">{p.pair}</p>
                  <p className="text-xl font-bold text-profit-600 mt-1">+{p.profit.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.trades} trades · Avg spread {p.spread}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

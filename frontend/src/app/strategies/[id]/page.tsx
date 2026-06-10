'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MiniChart } from '@/components/ui/Charts';
import { DataTable } from '@/components/ui/DataTable';

export default function StrategyDetailPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'settings'>('overview');

  const strategy = {
    id: '1',
    name: 'Triangular Arbitrage',
    description: 'Exploit price differences in A→B→C→A token cycles across multiple DEXes',
    type: 'Triangular',
    status: 'active',
    createdAt: '2026-05-06',
    updatedAt: '2 min ago',
    stats: {
      totalTrades: 234,
      successfulTrades: 169,
      failedTrades: 65,
      totalProfit: '156.78',
      netProfit: '133.33',
      winRate: 72.3,
      avgProfitPerTrade: '0.67',
      maxDrawdown: 5.2,
      sharpeRatio: 2.34,
    },
    parameters: {
      minProfitBps: 30,
      maxSlippageBps: 50,
      maxTradeSize: 5000,
      pairs: ['WETH/USDC/WMNT'],
      gasLimit: 300000,
      cooldownMs: 5000,
    },
  };

  const profitData = Array.from({ length: 30 }, (_, i) => ({
    time: `Day ${i + 1}`,
    value: 100 + Math.random() * 30 + i * 5,
  }));

  const tradeColumns = [
    { key: 'time', title: 'Time' },
    { key: 'pair', title: 'Pair', render: (v: string) => <span className="font-medium">{v}</span> },
    { key: 'amount', title: 'Amount' },
    { key: 'profit', title: 'Profit', render: (v: string) => (
      <span className={v.startsWith('+') ? 'text-profit-600 font-bold' : 'text-loss-600 font-bold'}>{v}</span>
    )},
    { key: 'dex', title: 'DEX Path' },
    { key: 'status', title: 'Status', render: (v: string) => (
      <span className={`badge ${v === 'Success' ? 'badge-success' : 'badge-danger'}`}>{v}</span>
    )},
  ];

  const recentTrades = [
    { time: '14:32:01', pair: 'WETH/USDC/WMNT', amount: '1.5 WETH', profit: '+0.0234 MNT', dex: 'Moe→FX→Agni', status: 'Success' },
    { time: '14:28:45', pair: 'WETH/USDC/WMNT', amount: '2.0 WETH', profit: '+0.0189 MNT', dex: 'FX→Agni→Moe', status: 'Success' },
    { time: '14:25:12', pair: 'WETH/USDC/WMNT', amount: '1.0 WETH', profit: '-0.0012 MNT', dex: 'Agni→Moe→FX', status: 'Failed' },
    { time: '14:20:33', pair: 'WETH/USDC/WMNT', amount: '0.5 WETH', profit: '+0.0045 MNT', dex: 'Moe→Agni→FX', status: 'Success' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title={strategy.name} subtitle={`${strategy.type} Strategy · ${strategy.status}`} />
        <main className="p-6 space-y-6">
          {/* Strategy Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`badge ${strategy.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {strategy.status}
              </span>
              <span className="badge badge-info">{strategy.type}</span>
              <span className="text-sm text-slate-500">Created {strategy.createdAt}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                Edit Strategy
              </button>
              <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                strategy.status === 'active'
                  ? 'bg-loss-50 text-loss-700 hover:bg-loss-100'
                  : 'bg-profit-50 text-profit-700 hover:bg-profit-100'
              }`}>
                {strategy.status === 'active' ? 'Pause Strategy' : 'Start Strategy'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex space-x-8">
              {(['overview', 'trades', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-mantle-600 text-mantle-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Net Profit', value: `${strategy.stats.netProfit} MNT`, color: 'text-profit-600' },
                  { label: 'Win Rate', value: `${strategy.stats.winRate}%`, color: 'text-mantle-600' },
                  { label: 'Total Trades', value: String(strategy.stats.totalTrades), color: 'text-slate-900' },
                  { label: 'Sharpe Ratio', value: strategy.stats.sharpeRatio.toFixed(2), color: 'text-slate-900' },
                  { label: 'Max Drawdown', value: `${strategy.stats.maxDrawdown}%`, color: 'text-loss-600' },
                  { label: 'Avg Profit', value: `${strategy.stats.avgProfitPerTrade} MNT`, color: 'text-profit-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Profit Chart */}
              <MiniChart data={profitData} title="Cumulative Profit (30 Days)" height={250} color="#22c55e" />

              {/* Success/Fail Ratio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Trade Outcomes</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-profit-600">Successful</span>
                        <span className="text-sm font-medium text-profit-600">{strategy.stats.successfulTrades}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className="bg-profit-500 h-3 rounded-full" style={{ width: `${(strategy.stats.successfulTrades / strategy.stats.totalTrades) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-loss-600">Failed</span>
                        <span className="text-sm font-medium text-loss-600">{strategy.stats.failedTrades}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className="bg-loss-500 h-3 rounded-full" style={{ width: `${(strategy.stats.failedTrades / strategy.stats.totalTrades) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Parameters</h3>
                  <div className="space-y-3">
                    {Object.entries(strategy.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-500">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </span>
                        <span className="text-sm font-medium text-slate-900 font-mono">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'trades' && (
            <DataTable columns={tradeColumns} data={recentTrades} />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Strategy Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(strategy.parameters).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </label>
                    <input
                      type={typeof value === 'number' ? 'number' : 'text'}
                      defaultValue={Array.isArray(value) ? value.join(', ') : String(value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
              <button className="mt-6 px-6 py-2.5 bg-mantle-600 text-white rounded-lg text-sm font-medium hover:bg-mantle-700">
                Save Changes
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

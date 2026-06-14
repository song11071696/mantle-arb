'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DataTable } from '@/components/ui/DataTable';

const mockTrades = [
  { id: 'TX001', time: '2026-06-05 14:32:01', pair: 'WETH/USDC', strategy: 'Cross-DEX', buyDex: 'Merchant Moe', sellDex: 'FusionX', amountIn: '1.5 WETH', amountOut: '5,768.25 USDC', profit: '+0.0234 MNT', gasUsed: '0.0012 MNT', status: 'Success', txHash: '0xabc...def' },
  { id: 'TX002', time: '2026-06-05 14:28:45', pair: 'WMNT/USDT', strategy: 'Triangular', buyDex: 'Agni', sellDex: 'CyberSwap', amountIn: '1000 WMNT', amountOut: '1,234.56 USDT', profit: '-0.0012 MNT', gasUsed: '0.0008 MNT', status: 'Loss', txHash: '0x123...456' },
  { id: 'TX003', time: '2026-06-05 14:25:12', pair: 'WBTC/WETH', strategy: 'Flash Loan', buyDex: 'Helix', sellDex: 'iZiSwap', amountIn: '0.1 WBTC', amountOut: '2.73 WETH', profit: '+0.0456 MNT', gasUsed: '0.0015 MNT', status: 'Success', txHash: '0x789...012' },
  { id: 'TX004', time: '2026-06-05 14:20:33', pair: 'WETH/USDC', strategy: 'Cross-DEX', buyDex: 'FusionX', sellDex: 'Merchant Moe', amountIn: '2.0 WETH', amountOut: '7,690.24 USDC', profit: '+0.0189 MNT', gasUsed: '0.0011 MNT', status: 'Success', txHash: '0xdef...abc' },
  { id: 'TX005', time: '2026-06-05 14:15:08', pair: 'USDC/USDT', strategy: 'Statistical', buyDex: 'Merchant Moe', sellDex: 'Agni', amountIn: '5000 USDC', amountOut: '5002.50 USDT', profit: '+0.0034 MNT', gasUsed: '0.0006 MNT', status: 'Success', txHash: '0x456...789' },
  { id: 'TX006', time: '2026-06-05 14:10:22', pair: 'WMNT/WETH', strategy: 'Triangular', buyDex: 'CyberSwap', sellDex: 'Helix', amountIn: '500 WMNT', amountOut: '0.161 WETH', profit: '+0.0078 MNT', gasUsed: '0.0009 MNT', status: 'Success', txHash: '0xghi...jkl' },
  { id: 'TX007', time: '2026-06-05 14:05:55', pair: 'WBTC/USDC', strategy: 'Flash Loan', buyDex: 'iZiSwap', sellDex: 'Merchant Moe', amountIn: '0.05 WBTC', amountOut: '5,226.18 USDC', profit: '+0.0312 MNT', gasUsed: '0.0014 MNT', status: 'Success', txHash: '0xmno...pqr' },
  { id: 'TX008', time: '2026-06-05 14:00:11', pair: 'WETH/USDT', strategy: 'Cross-DEX', buyDex: 'Agni', sellDex: 'FusionX', amountIn: '0.8 WETH', amountOut: '3,074.80 USDT', profit: 'Failed', gasUsed: '0.0003 MNT', status: 'Failed', txHash: '0xstu...vwx' },
];

const columns = [
  { key: 'id', title: 'ID', className: 'font-mono text-xs' },
  { key: 'time', title: 'Time' },
  { key: 'pair', title: 'Pair', render: (v: string) => <span className="font-medium">{v}</span> },
  { key: 'strategy', title: 'Strategy', render: (v: string) => <span className="badge badge-info">{v}</span> },
  { key: 'buyDex', title: 'Buy DEX' },
  { key: 'sellDex', title: 'Sell DEX' },
  { key: 'profit', title: 'Profit', render: (v: string) => (
    <span className={v.startsWith('+') ? 'text-profit-600 font-bold' : v === 'Failed' ? 'text-slate-400' : 'text-loss-600 font-bold'}>
      {v}
    </span>
  )},
  { key: 'status', title: 'Status', render: (v: string) => (
    <span className={`badge ${v === 'Success' ? 'badge-success' : v === 'Loss' ? 'badge-warning' : 'badge-danger'}`}>
      {v}
    </span>
  )},
];

export default function TradesPage() {
  const [dateRange, setDateRange] = useState('today');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Trade History" subtitle="Complete record of all arbitrage trades" />
        <main className="p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Trades</p>
              <p className="text-2xl font-bold text-slate-900">479</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Successful</p>
              <p className="text-2xl font-bold text-profit-600">428</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Failed</p>
              <p className="text-2xl font-bold text-loss-600">51</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Net Profit</p>
              <p className="text-2xl font-bold text-profit-600">+1,234.56 MNT</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-4 mb-4">
            {['today', 'week', 'month', 'all'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  dateRange === r ? 'bg-mantle-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Trades Table */}
          <DataTable columns={columns} data={mockTrades} />
        </main>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MiniChart } from '@/components/ui/Charts';

interface BacktestResult {
  strategy: string;
  period: string;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  avgProfit: number;
}

const mockResults: BacktestResult[] = [
  { strategy: 'Triangular Arb', period: '2026-01 to 2026-05', totalProfit: 1234.56, maxDrawdown: -5.2, sharpeRatio: 2.34, winRate: 72.3, totalTrades: 567, avgProfit: 2.18 },
  { strategy: 'Cross-DEX Spread', period: '2026-01 to 2026-05', totalProfit: 987.65, maxDrawdown: -3.8, sharpeRatio: 1.89, winRate: 68.1, totalTrades: 423, avgProfit: 2.33 },
  { strategy: 'Flash Loan Arb', period: '2026-01 to 2026-05', totalProfit: 2345.67, maxDrawdown: -8.1, sharpeRatio: 3.12, winRate: 81.5, totalTrades: 189, avgProfit: 12.41 },
  { strategy: 'Statistical Arb', period: '2026-01 to 2026-05', totalProfit: -123.45, maxDrawdown: -15.3, sharpeRatio: -0.45, winRate: 55.6, totalTrades: 234, avgProfit: -0.53 },
];

export default function BacktestingPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [running, setRunning] = useState(false);

  const equityCurve = Array.from({ length: 120 }, (_, i) => ({
    time: `W${i}`,
    value: 1000 + Math.random() * 200 + i * 10 + (Math.random() > 0.9 ? -50 : 0),
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Backtesting" subtitle="Test strategies against historical data" />
        <main className="p-6 space-y-6">
          {/* Config Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Backtest Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strategy</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                  <option value="all">All Strategies</option>
                  <option value="triangular">Triangular Arbitrage</option>
                  <option value="cross-dex">Cross-DEX Spread</option>
                  <option value="flash-loan">Flash Loan Arb</option>
                  <option value="statistical">Statistical Arbitrage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input type="date" defaultValue="2026-01-01" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input type="date" defaultValue="2026-05-31" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Capital</label>
                <input type="number" defaultValue={10000} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <button
              onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 3000); }}
              disabled={running}
              className={`mt-4 px-6 py-2.5 rounded-lg text-sm font-medium ${
                running ? 'bg-slate-300 text-slate-500' : 'bg-mantle-600 text-white hover:bg-mantle-700'
              }`}
            >
              {running ? 'Running Backtest...' : 'Run Backtest'}
            </button>
          </div>

          {/* Equity Curve */}
          <MiniChart data={equityCurve} title="Equity Curve" height={300} color="#22c55e" />

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Backtest Results</h3>
            </div>
            <table>
              <thead className="bg-slate-50">
                <tr>
                  <th>Strategy</th>
                  <th>Period</th>
                  <th>Total Profit</th>
                  <th>Max Drawdown</th>
                  <th>Sharpe Ratio</th>
                  <th>Win Rate</th>
                  <th>Total Trades</th>
                  <th>Avg Profit/Trade</th>
                </tr>
              </thead>
              <tbody>
                {mockResults.map(r => (
                  <tr key={r.strategy}>
                    <td className="font-medium">{r.strategy}</td>
                    <td className="text-slate-500">{r.period}</td>
                    <td className={r.totalProfit >= 0 ? 'text-profit-600 font-bold' : 'text-loss-600 font-bold'}>
                      {r.totalProfit >= 0 ? '+' : ''}{r.totalProfit.toFixed(2)} MNT
                    </td>
                    <td className="text-loss-600">{r.maxDrawdown}%</td>
                    <td>{r.sharpeRatio.toFixed(2)}</td>
                    <td>{r.winRate}%</td>
                    <td>{r.totalTrades}</td>
                    <td className={r.avgProfit >= 0 ? 'text-profit-600' : 'text-loss-600'}>
                      {r.avgProfit >= 0 ? '+' : ''}{r.avgProfit.toFixed(2)} MNT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

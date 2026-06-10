'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MiniChart } from '@/components/ui/Charts';

const dexes = ['Merchant Moe', 'FusionX', 'Agni', 'CyberSwap', 'Helix', 'iZiSwap'];

interface PriceData {
  dex: string;
  token: string;
  price: number;
  change: number;
  volume24h: number;
  lastUpdate: string;
}

const generateMockData = (): PriceData[] => {
  const tokens = ['WETH', 'WMNT', 'WBTC', 'USDC', 'USDT'];
  return dexes.flatMap(dex =>
    tokens.map(token => ({
      dex,
      token,
      price: token === 'WBTC' ? 104000 + Math.random() * 1000 : token === 'WETH' ? 3800 + Math.random() * 100 : token === 'WMNT' ? 1.2 + Math.random() * 0.1 : 0.999 + Math.random() * 0.002,
      change: (Math.random() - 0.5) * 5,
      volume24h: Math.random() * 1000000,
      lastUpdate: 'Just now',
    }))
  );
};

export default function MonitoringPage() {
  const [prices, setPrices] = useState<PriceData[]>(generateMockData());
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(generateMockData());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartData = Array.from({ length: 30 }, (_, i) => ({
    time: `${i}s`,
    value: 3800 + Math.random() * 100,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Live Monitoring" subtitle="Real-time price and trade monitoring" />
        <main className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${wsStatus === 'connected' ? 'bg-profit-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-loss-500'}`} />
                <span className="text-sm font-medium text-slate-700">WebSocket: {wsStatus}</span>
              </div>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">Latency: 12ms</span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">Updates/sec: 3.2</span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 text-sm bg-mantle-50 text-mantle-700 rounded-lg hover:bg-mantle-100">
                Reconnect
              </button>
              <button className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                Pause
              </button>
            </div>
          </div>

          {/* Price Chart */}
          <MiniChart data={chartData} title="WETH/USDC Real-Time Price" height={200} color="#0ea5e9" />

          {/* DEX Price Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dexes.map(dex => {
              const dexPrices = prices.filter(p => p.dex === dex);
              return (
                <div key={dex} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{dex}</h3>
                    <span className="w-2 h-2 bg-profit-500 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    {dexPrices.map(p => (
                      <div key={p.token} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-sm text-slate-600">{p.token}</span>
                        <div className="text-right">
                          <span className="text-sm font-mono font-medium text-slate-900">
                            ${p.price.toFixed(p.price > 100 ? 2 : 4)}
                          </span>
                          <span className={`ml-2 text-xs ${p.change >= 0 ? 'text-profit-600' : 'text-loss-600'}`}>
                            {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alerts Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Alerts</h3>
            <div className="space-y-2">
              {[
                { time: '14:32:01', type: 'opportunity', msg: 'WETH spread 0.45% detected: Merchant Moe → FusionX' },
                { time: '14:28:45', type: 'warning', msg: 'High gas price detected: 45 gwei (threshold: 30 gwei)' },
                { time: '14:25:12', type: 'success', msg: 'Trade TX003 completed: +0.0456 MNT profit' },
                { time: '14:20:33', type: 'info', msg: 'Strategy "Triangular Arb" paused due to low liquidity' },
                { time: '14:15:08', type: 'error', msg: 'Trade TX008 failed: slippage exceeded 1% threshold' },
              ].map((alert, i) => (
                <div key={i} className={`flex items-start space-x-3 p-3 rounded-lg ${
                  alert.type === 'opportunity' ? 'bg-mantle-50' :
                  alert.type === 'success' ? 'bg-profit-50' :
                  alert.type === 'warning' ? 'bg-yellow-50' :
                  alert.type === 'error' ? 'bg-loss-50' : 'bg-slate-50'
                }`}>
                  <span className="text-xs text-slate-400 font-mono mt-0.5">{alert.time}</span>
                  <p className="text-sm text-slate-700">{alert.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

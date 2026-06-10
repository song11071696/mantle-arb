'use client';

import React from 'react';
import { clsx } from 'clsx';

interface LiveMonitorProps {
  opportunities: {
    id: string;
    pair: string;
    buyDex: string;
    sellDex: string;
    spread: number;
    estimatedProfit: number;
    gasEstimate: number;
    timestamp: string;
    status: 'hot' | 'warm' | 'expired';
  }[];
  onExecute?: (id: string) => void;
}

export function LiveMonitor({ opportunities, onExecute }: LiveMonitorProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Live Opportunities</h3>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-profit-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-500">Scanning...</span>
        </div>
      </div>
      <div className="space-y-3">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className={clsx(
              'p-4 rounded-lg border transition-all',
              opp.status === 'hot' && 'border-profit-300 bg-profit-50 profit-glow',
              opp.status === 'warm' && 'border-yellow-300 bg-yellow-50',
              opp.status === 'expired' && 'border-slate-200 bg-slate-50 opacity-60'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-900">{opp.pair}</span>
                  <span
                    className={clsx(
                      'badge',
                      opp.status === 'hot' && 'badge-success',
                      opp.status === 'warm' && 'badge-warning',
                      opp.status === 'expired' && 'badge-danger'
                    )}
                  >
                    {opp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Buy: {opp.buyDex} → Sell: {opp.sellDex}
                </p>
                <p className="text-xs text-slate-400 mt-1">{opp.timestamp}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-profit-600">+{opp.estimatedProfit.toFixed(4)} MNT</p>
                <p className="text-xs text-slate-500">Spread: {opp.spread.toFixed(2)}%</p>
                <p className="text-xs text-slate-400">Gas: ~{opp.gasEstimate} gwei</p>
              </div>
            </div>
            {opp.status === 'hot' && onExecute && (
              <button
                onClick={() => onExecute(opp.id)}
                className="mt-3 w-full py-2 bg-profit-600 text-white text-sm font-medium rounded-lg hover:bg-profit-700 transition-colors"
              >
                Execute Trade
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

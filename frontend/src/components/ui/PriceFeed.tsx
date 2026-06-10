'use client';

import React from 'react';
import { clsx } from 'clsx';

interface PriceFeedProps {
  prices: {
    token: string;
    symbol: string;
    price: number;
    change24h: number;
    dex: string;
  }[];
}

export function PriceFeed({ prices }: PriceFeedProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Live Prices</h3>
      <div className="space-y-3">
        {prices.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{item.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{item.symbol}</p>
                <p className="text-xs text-slate-500">{item.dex}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">${item.price.toFixed(4)}</p>
              <p
                className={clsx(
                  'text-xs font-medium',
                  item.change24h >= 0 ? 'text-profit-600' : 'text-loss-600'
                )}
              >
                {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

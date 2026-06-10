'use client';

import React from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function TradeDetailPage() {
  const trade = {
    id: 'TX001',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 12345678,
    timestamp: '2026-06-05 14:32:01',
    strategy: 'Cross-DEX Spread',
    pair: 'WETH/USDC',
    amountIn: '1.5 WETH',
    amountOut: '5,768.25 USDC',
    profit: '+0.0234 MNT',
    gasUsed: '180,000',
    gasCost: '0.0012 MNT',
    buyDex: 'Merchant Moe',
    sellDex: 'FusionX',
    buyPrice: '$3,842.50',
    sellPrice: '$3,845.12',
    spread: '0.068%',
    usedFlashLoan: false,
    status: 'Success',
    slippage: '0.02%',
    executionTime: '1.2s',
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Trade Details" subtitle={`Transaction ${trade.id}`} />
        <main className="p-6 space-y-6">
          {/* Status Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="badge badge-success">{trade.status}</span>
                <span className="badge badge-info">{trade.strategy}</span>
                <span className="text-sm text-slate-500">{trade.timestamp}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-profit-600">{trade.profit}</p>
                <p className="text-sm text-slate-500">Net Profit</p>
              </div>
            </div>
          </div>

          {/* Trade Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Transaction Details</h3>
              <div className="space-y-3">
                {[
                  { label: 'Transaction Hash', value: `${trade.txHash.slice(0, 20)}...`, mono: true },
                  { label: 'Block Number', value: trade.blockNumber.toLocaleString(), mono: true },
                  { label: 'Trading Pair', value: trade.pair },
                  { label: 'Strategy', value: trade.strategy },
                  { label: 'Flash Loan', value: trade.usedFlashLoan ? 'Yes' : 'No' },
                  { label: 'Execution Time', value: trade.executionTime },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className={`text-sm font-medium text-slate-900 ${item.mono ? 'font-mono' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Execution */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Execution Details</h3>
              <div className="space-y-3">
                {[
                  { label: 'Amount In', value: trade.amountIn },
                  { label: 'Amount Out', value: trade.amountOut },
                  { label: 'Buy DEX', value: trade.buyDex },
                  { label: 'Sell DEX', value: trade.sellDex },
                  { label: 'Buy Price', value: trade.buyPrice },
                  { label: 'Sell Price', value: trade.sellPrice },
                  { label: 'Spread', value: trade.spread },
                  { label: 'Slippage', value: trade.slippage },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gas & Costs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Gas & Costs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Gas Used</p>
                <p className="text-xl font-bold text-slate-900 font-mono">{trade.gasUsed}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Gas Cost</p>
                <p className="text-xl font-bold text-slate-900">{trade.gasCost}</p>
              </div>
              <div className="p-4 bg-profit-50 rounded-lg">
                <p className="text-sm text-profit-600">Net Profit (after gas)</p>
                <p className="text-xl font-bold text-profit-700">{trade.profit}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <a
              href={`https://mantlescan.xyz/tx/${trade.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-mantle-600 text-white rounded-lg text-sm font-medium hover:bg-mantle-700"
            >
              View on MantleScan
            </a>
            <Link
              href="/trades"
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Back to Trade History
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

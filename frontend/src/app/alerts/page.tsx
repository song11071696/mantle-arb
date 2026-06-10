'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function AlertsPage() {
  const alerts = [
    { id: 1, type: 'opportunity', severity: 'high', title: 'High Spread Detected', message: 'WETH/USDC spread 0.65% between Merchant Moe and FusionX', time: '2 min ago', read: false },
    { id: 2, type: 'risk', severity: 'critical', title: 'Daily Limit Warning', message: 'Approaching daily trade limit (85/100 trades today)', time: '5 min ago', read: false },
    { id: 3, type: 'trade', severity: 'success', title: 'Trade Completed', message: 'TX003: +0.0456 MNT profit on WBTC/WETH via Flash Loan', time: '8 min ago', read: true },
    { id: 4, type: 'system', severity: 'warning', title: 'High Gas Price', message: 'Current gas price 45 gwei exceeds threshold of 30 gwei', time: '12 min ago', read: true },
    { id: 5, type: 'trade', severity: 'error', title: 'Trade Failed', message: 'TX008: Slippage exceeded 1% threshold on WETH/USDT', time: '15 min ago', read: true },
    { id: 6, type: 'opportunity', severity: 'medium', title: 'Triangular Opportunity', message: 'WETH→WMNT→USDC→WETH cycle: estimated 0.3% profit', time: '20 min ago', read: true },
    { id: 7, type: 'system', severity: 'info', title: 'Strategy Paused', message: 'Statistical Arb strategy auto-paused: 3 consecutive losses', time: '30 min ago', read: true },
    { id: 8, type: 'risk', severity: 'warning', title: 'Oracle Deviation', message: 'WETH oracle price deviates 2.3% from DEX price', time: '45 min ago', read: true },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-loss-100 border-loss-300 text-loss-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'success': return 'bg-profit-100 border-profit-300 text-profit-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'error': return 'bg-loss-100 border-loss-300 text-loss-800';
      default: return 'bg-slate-100 border-slate-300 text-slate-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return '🎯';
      case 'risk': return '⚠️';
      case 'trade': return '💱';
      case 'system': return '🔧';
      default: return '📋';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Alerts" subtitle="System notifications and trade alerts" />
        <main className="p-6">
          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Unread</p>
              <p className="text-2xl font-bold text-mantle-600">2</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Critical</p>
              <p className="text-2xl font-bold text-loss-600">1</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Opportunities</p>
              <p className="text-2xl font-bold text-profit-600">2</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Today Total</p>
              <p className="text-2xl font-bold text-slate-900">8</p>
            </div>
          </div>

          {/* Alert List */}
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)} ${!alert.read ? 'ring-2 ring-mantle-300' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{getTypeIcon(alert.type)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{alert.title}</h4>
                        {!alert.read && <span className="w-2 h-2 bg-mantle-500 rounded-full" />}
                      </div>
                      <p className="text-sm mt-1 opacity-80">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs opacity-60">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

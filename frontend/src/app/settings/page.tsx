'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function SettingsPage() {
  const [riskParams, setRiskParams] = useState({
    maxTradeSize: 10000,
    minProfitBps: 50,
    maxSlippageBps: 100,
    dailyTradeLimit: 100,
    maxFlashLoanSize: 100000,
    maxPriceDeviationBps: 500,
  });

  const [notifications, setNotifications] = useState({
    email: true,
    telegram: false,
    discord: true,
    tradeAlerts: true,
    riskAlerts: true,
    opportunityAlerts: true,
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Settings" subtitle="Configure risk parameters and preferences" />
        <main className="p-6 space-y-6">
          {/* Risk Parameters */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(riskParams).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => setRiskParams(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {key === 'maxTradeSize' && 'Maximum single trade size in USD'}
                    {key === 'minProfitBps' && 'Minimum profit threshold in basis points (50 = 0.5%)'}
                    {key === 'maxSlippageBps' && 'Maximum allowed slippage in basis points (100 = 1%)'}
                    {key === 'dailyTradeLimit' && 'Maximum number of trades per day'}
                    {key === 'maxFlashLoanSize' && 'Maximum flash loan amount in USD'}
                    {key === 'maxPriceDeviationBps' && 'Maximum oracle price deviation (500 = 5%)'}
                  </p>
                </div>
              ))}
            </div>
            <button className="mt-6 px-6 py-2.5 bg-mantle-600 text-white rounded-lg text-sm font-medium hover:bg-mantle-700">
              Save Risk Parameters
            </button>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Notification Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 text-mantle-600 border-slate-300 rounded focus:ring-mantle-500"
                    />
                    <span className="text-sm text-slate-700">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button className="mt-4 px-6 py-2.5 bg-mantle-600 text-white rounded-lg text-sm font-medium hover:bg-mantle-700">
              Save Notification Settings
            </button>
          </div>

          {/* Wallet Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Wallet & Network</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Connected Wallet</label>
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="w-2 h-2 bg-profit-500 rounded-full" />
                  <span className="text-sm font-mono text-slate-700">0x1234...5678</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Network</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option>Mantle Mainnet</option>
                  <option>Mantle Testnet</option>
                </select>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

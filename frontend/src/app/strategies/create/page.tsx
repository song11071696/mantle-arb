'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const strategyTypes = [
  {
    id: 'triangular',
    name: 'Triangular Arbitrage',
    description: 'Exploit price differences in A→B→C→A token cycles',
    icon: '🔺',
    defaultParams: { minProfitBps: 30, maxSlippageBps: 50, pairs: 'WETH/USDC/WMNT' },
  },
  {
    id: 'cross-dex',
    name: 'Cross-DEX Spread',
    description: 'Buy low on one DEX, sell high on another',
    icon: '↔️',
    defaultParams: { minProfitBps: 20, maxSlippageBps: 80, pairs: 'WETH/USDC' },
  },
  {
    id: 'flash-loan',
    name: 'Flash Loan Arbitrage',
    description: 'Zero-capital arbitrage using flash loans',
    icon: '⚡',
    defaultParams: { minProfitBps: 50, maxSlippageBps: 30, flashLoanProvider: 'balancer' },
  },
  {
    id: 'statistical',
    name: 'Statistical Arbitrage',
    description: 'Mean-reversion pairs trading using z-score analysis',
    icon: '📈',
    defaultParams: { zScoreThreshold: 2.0, lookbackPeriod: 100 },
  },
];

export default function CreateStrategyPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const handleTypeSelect = (type: typeof strategyTypes[0]) => {
    setSelectedType(type.id);
    setName(type.name);
    setDescription(type.description);
    const defaultParams: Record<string, string> = {};
    Object.entries(type.defaultParams).forEach(([k, v]) => {
      defaultParams[k] = String(v);
    });
    setParams(defaultParams);
  };

  const handleCreate = async () => {
    setCreating(true);
    // Simulate API call
    setTimeout(() => {
      setCreating(false);
      router.push('/strategies');
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Create Strategy" subtitle="Design a new arbitrage trading strategy" />
        <main className="p-6 space-y-6">
          {/* Step 1: Choose Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">1. Choose Strategy Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {strategyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedType === type.id
                      ? 'border-mantle-500 bg-mantle-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <h4 className="mt-2 font-semibold text-slate-900">{type.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Basic Info */}
          {selectedType && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">2. Strategy Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Strategy Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="My Strategy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Strategy description"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Parameters */}
          {selectedType && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">3. Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(params).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {selectedType && (
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => router.push('/strategies')}
                className="px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium ${
                  creating || !name
                    ? 'bg-slate-300 text-slate-500'
                    : 'bg-mantle-600 text-white hover:bg-mantle-700'
                }`}
              >
                {creating ? 'Creating...' : 'Create Strategy'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

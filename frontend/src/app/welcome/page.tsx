'use client';

import React from 'react';
import Link from 'next/link';

const features = [
  {
    title: 'Triangular Arbitrage',
    description: 'Exploit price differences in A→B→C→A token cycles across multiple DEXes on Mantle',
    icon: '🔺',
  },
  {
    title: 'Cross-DEX Spread',
    description: 'Automatically buy low on one DEX and sell high on another for the same trading pair',
    icon: '↔️',
  },
  {
    title: 'Flash Loan Arbitrage',
    description: 'Zero-capital arbitrage using Balancer and Aave flash loans for maximum capital efficiency',
    icon: '⚡',
  },
  {
    title: 'AI-Powered Detection',
    description: 'Machine learning algorithms detect profitable opportunities in milliseconds',
    icon: '🤖',
  },
  {
    title: 'Risk Management',
    description: 'Configurable risk parameters, daily limits, and automatic circuit breakers',
    icon: '🛡️',
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Live price feeds, WebSocket updates, and instant alert notifications',
    icon: '📊',
  },
];

const supportedDexes = [
  { name: 'Merchant Moe', tvl: '$45M' },
  { name: 'FusionX', tvl: '$32M' },
  { name: 'Agni', tvl: '$28M' },
  { name: 'CyberSwap', tvl: '$15M' },
  { name: 'Helix', tvl: '$22M' },
  { name: 'iZiSwap', tvl: '$18M' },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-mantle-950 to-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-bold">M</span>
          </div>
          <span className="text-xl font-bold text-white">MantleArb</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-mantle-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-mantle-600 text-white rounded-lg text-sm font-medium hover:bg-mantle-700 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-mantle-500/10 border border-mantle-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-profit-500 rounded-full animate-pulse" />
            <span className="text-sm text-mantle-300">Live on Mantle Network</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            AI-Powered<br />
            <span className="bg-gradient-to-r from-mantle-400 to-mantle-600 bg-clip-text text-transparent">
              DEX Arbitrage
            </span>
          </h1>
          
          <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
            Automated arbitrage trading across 6+ DEXes on Mantle Network. 
            Detect price discrepancies, execute trades, and earn profits with minimal risk.
          </p>

          <div className="mt-10 flex items-center justify-center space-x-4">
            <Link
              href="/"
              className="px-8 py-3.5 bg-mantle-600 text-white rounded-xl text-lg font-medium hover:bg-mantle-700 transition-colors shadow-lg shadow-mantle-600/25"
            >
              Launch Dashboard
            </Link>
            <a
              href="https://github.com/mantle-arb"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-white/5 text-white rounded-xl text-lg font-medium hover:bg-white/10 transition-colors border border-white/10"
            >
              View on GitHub
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Total Profit Generated', value: '1,234 MNT' },
              { label: 'Successful Trades', value: '479+' },
              { label: 'Average Win Rate', value: '73.2%' },
            ].map((stat) => (
              <div key={stat.label} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-8 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Powerful Features</h2>
          <p className="mt-4 text-slate-400">Everything you need for automated arbitrage trading</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-mantle-500/30 transition-all hover:bg-white/[0.07]"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Supported DEXes */}
      <div className="max-w-6xl mx-auto px-8 pb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Supported DEXes</h2>
          <p className="mt-4 text-slate-400">Arbitrage across the top DEXes on Mantle Network</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {supportedDexes.map((dex) => (
            <div
              key={dex.name}
              className="p-4 bg-white/5 rounded-xl border border-white/10 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-sm">{dex.name.slice(0, 2)}</span>
              </div>
              <p className="text-sm font-medium text-white">{dex.name}</p>
              <p className="text-xs text-slate-500 mt-1">TVL: {dex.tvl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto px-8 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
          <p className="mt-4 text-slate-400">Simple 4-step automated arbitrage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '01', title: 'Scan', description: 'Continuously monitor prices across all DEXes' },
            { step: '02', title: 'Detect', description: 'AI identifies profitable arbitrage opportunities' },
            { step: '03', title: 'Execute', description: 'Atomic transactions ensure safe execution' },
            { step: '04', title: 'Profit', description: 'Collect profits with minimal gas costs' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-4xl font-bold text-mantle-500 mb-3">{item.step}</div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-8 pb-20">
        <div className="p-12 bg-gradient-to-r from-mantle-600 to-mantle-800 rounded-3xl text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Start Arbitraging?</h2>
          <p className="mt-4 text-mantle-200 max-w-xl mx-auto">
            Connect your wallet and start earning automated arbitrage profits on Mantle Network.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block px-8 py-3.5 bg-white text-mantle-700 rounded-xl text-lg font-medium hover:bg-mantle-50 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-sm text-slate-500">MantleArb © 2026</span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">Docs</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">GitHub</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

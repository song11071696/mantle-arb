'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  const handleConnect = (wallet: string) => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      router.push('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-mantle-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-white">MantleArb</h1>
          <p className="mt-2 text-mantle-300">AI-Powered DEX Arbitrage Agent</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Connect Wallet</h2>
          
          <div className="space-y-3">
            {[
              { name: 'MetaMask', icon: '🦊', popular: true },
              { name: 'WalletConnect', icon: '🔗', popular: false },
              { name: 'Coinbase Wallet', icon: '🔵', popular: false },
            ].map(wallet => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                disabled={connecting}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="text-white font-medium">{wallet.name}</span>
                  {wallet.popular && (
                    <span className="text-xs bg-mantle-500/20 text-mantle-300 px-2 py-0.5 rounded-full">Popular</span>
                  )}
                </div>
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {connecting && (
            <div className="mt-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-mantle-400 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-mantle-300">Connecting...</p>
            </div>
          )}

          <p className="mt-6 text-xs text-white/40 text-center">
            By connecting, you agree to MantleArb's Terms of Service
          </p>
        </div>

        <p className="mt-6 text-sm text-white/30 text-center">
          Powered by Mantle Network
        </p>
      </div>
    </div>
  );
}

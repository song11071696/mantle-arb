'use client';

import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {change && (
            <div className="flex items-center mt-2">
              <span
                className={clsx(
                  'text-sm font-medium',
                  changeType === 'positive' && 'text-profit-600',
                  changeType === 'negative' && 'text-loss-600',
                  changeType === 'neutral' && 'text-slate-500'
                )}
              >
                {change}
              </span>
              {changeType === 'positive' && (
                <svg className="w-4 h-4 ml-1 text-profit-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                </svg>
              )}
              {changeType === 'negative' && (
                <svg className="w-4 h-4 ml-1 text-loss-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-mantle-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface TradeCardProps {
  trade: {
    id: string;
    pair: string;
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    profit: number;
    timestamp: string;
    status: 'completed' | 'pending' | 'failed';
    dex: string;
  };
}

export function TradeCard({ trade }: TradeCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 card-hover">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center',
              trade.type === 'buy' ? 'bg-profit-100' : 'bg-loss-100'
            )}
          >
            <span className={clsx('text-sm font-bold', trade.type === 'buy' ? 'text-profit-600' : 'text-loss-600')}>
              {trade.type === 'buy' ? '↑' : '↓'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{trade.pair}</p>
            <p className="text-xs text-slate-500">{trade.dex} · {trade.timestamp}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={clsx('text-sm font-bold', trade.profit >= 0 ? 'text-profit-600' : 'text-loss-600')}>
            {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(4)} MNT
          </p>
          <span
            className={clsx(
              'badge',
              trade.status === 'completed' && 'badge-success',
              trade.status === 'pending' && 'badge-warning',
              trade.status === 'failed' && 'badge-danger'
            )}
          >
            {trade.status}
          </span>
        </div>
      </div>
    </div>
  );
}

interface StrategyCardProps {
  strategy: {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'paused' | 'stopped';
    profit: number;
    trades: number;
    winRate: number;
    type: string;
  };
  onToggle?: () => void;
}

export function StrategyCard({ strategy, onToggle }: StrategyCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-slate-900">{strategy.name}</h3>
            <span
              className={clsx(
                'badge',
                strategy.status === 'active' && 'badge-success',
                strategy.status === 'paused' && 'badge-warning',
                strategy.status === 'stopped' && 'badge-danger'
              )}
            >
              {strategy.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{strategy.description}</p>
          <span className="mt-2 inline-block text-xs font-medium text-mantle-600 bg-mantle-50 px-2 py-1 rounded">
            {strategy.type}
          </span>
        </div>
        <button
          onClick={onToggle}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            strategy.status === 'active'
              ? 'bg-loss-50 text-loss-700 hover:bg-loss-100'
              : 'bg-profit-50 text-profit-700 hover:bg-profit-100'
          )}
        >
          {strategy.status === 'active' ? 'Pause' : 'Start'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-500">Total Profit</p>
          <p className={clsx('text-sm font-bold', strategy.profit >= 0 ? 'text-profit-600' : 'text-loss-600')}>
            {strategy.profit.toFixed(2)} MNT
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Trades</p>
          <p className="text-sm font-bold text-slate-900">{strategy.trades}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Win Rate</p>
          <p className="text-sm font-bold text-slate-900">{strategy.winRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

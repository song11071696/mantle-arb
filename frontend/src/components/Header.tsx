'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [notifications] = useState(3);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="flex items-center justify-between h-full px-6">
        <div>
          {title && <h1 className="text-xl font-semibold text-slate-900">{title}</h1>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-2 w-64">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="ml-2 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-loss-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>

          {/* Wallet */}
          <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Connected</p>
              <p className="text-xs text-slate-500 font-mono">0x1234...5678</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-mantle-400 to-mantle-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

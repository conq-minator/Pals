import React, { useEffect, useState } from 'react';
import { glyClient, type ConnectionMode } from '../api/glyClient.js';
import {
  PayPalMonogram,
  SunIcon,
  MoonIcon
} from './Icons.js';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavClick?: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onNavClick
}) => {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('connecting');

  useEffect(() => {
    return glyClient.onConnectionChange((_connected, mode) => {
      setConnectionMode(mode);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        {/* Brand / Logo (PayPal dual-tone monogram + bold wordmark) */}
        <div className="flex items-center space-x-8">
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => onNavClick?.('overview')}
          >
            {/* PayPal Dual-Tone Monogram */}
            <PayPalMonogram className="w-8 h-9 transition-transform group-hover:scale-105" />

            <div className="flex items-baseline space-x-2">
              <span className="font-black text-2xl tracking-tighter text-[#003087] dark:text-white">
                Pay<span className="text-[#0079C1]">Pal</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest text-[#0079C1] bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/40">
                Agent Guard
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => onNavClick?.('overview')}
              className="hover:text-fintech-bright transition"
            >
              Overview
            </button>
            <button
              onClick={() => onNavClick?.('limits')}
              className="hover:text-fintech-bright transition"
            >
              Spending Safeguards
            </button>
            <button
              onClick={() => onNavClick?.('protection')}
              className="hover:text-fintech-bright transition"
            >
              Buyer Protection
            </button>
          </nav>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center space-x-3">
          {/* Gateway Status Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionMode === 'live_ws'
                  ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse'
                  : connectionMode === 'connecting'
                  ? 'bg-blue-500'
                  : connectionMode === 'simulated'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>
              GLY:{' '}
              {connectionMode === 'live_ws'
                ? 'Live'
                : connectionMode === 'connecting'
                ? 'Connecting…'
                : connectionMode === 'simulated'
                ? 'Simulated (not real)'
                : 'Offline'}
            </span>
          </div>

          {/* Theme switcher */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {darkMode ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-fintech-deep" />}
          </button>

          {/* Log In / Sign Up pair */}
          <div className="flex items-center space-x-2">
            <button className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-fintech-bright px-3 py-2 rounded-full transition">
              Log In
            </button>
            <button className="text-xs sm:text-sm font-bold bg-[#003087] hover:bg-[#002466] text-white dark:bg-white dark:text-[#003087] dark:hover:bg-slate-100 px-5 py-2 rounded-full shadow-pill transition">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

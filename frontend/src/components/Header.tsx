import React, { useEffect, useState } from 'react';
import { Logo } from './Logo.js';
import { glyClient, type ConnectionMode } from '../api/glyClient.js';
import {
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
            <Logo />
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
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
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

        </div>
      </div>
    </header>
  );
};

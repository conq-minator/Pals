import React, { useEffect, useState } from 'react';
import { glyClient, type ConnectionMode } from '../api/glyClient.js';
import { MoonIcon, SunIcon } from './Icons.js';
import { Logo } from './Logo.js';

const LABEL: Record<ConnectionMode, string> = {
  live_ws: 'Connected',
  connecting: 'Connecting…',
  offline: 'Offline',
  simulated: 'Demo mode (not real)',
};
const DOT: Record<ConnectionMode, string> = {
  live_ws: 'bg-emerald-500',
  connecting: 'bg-blue-500 animate-pulse',
  offline: 'bg-rose-500',
  simulated: 'bg-amber-500',
};

export const Header: React.FC<{ darkMode: boolean; onToggleDarkMode: () => void }> = ({ darkMode, onToggleDarkMode }) => {
  const [mode, setMode] = useState<ConnectionMode>('connecting');
  useEffect(() => glyClient.onConnectionChange((_c, m) => setMode(m)), []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo />
          <span className="hidden truncate text-sm text-slate-500 sm:inline dark:text-slate-400">Shop and pay with PayPal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${DOT[mode]}`} />
            {LABEL[mode]}
          </span>
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {darkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

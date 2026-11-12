import React, { useState } from 'react';
import { UserFinancialPolicy } from '../types/index.js';
import {
  SlidersIcon,
  CheckCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  ScaleIcon,
  BanknotesIcon,
  LockClosedIcon
} from './Icons.js';

interface SpendingDashboardProps {
  policy: UserFinancialPolicy;
  onUpdatePolicy: (updated: UserFinancialPolicy) => void;
}

const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' }
];

export const SpendingDashboard: React.FC<SpendingDashboardProps> = ({
  policy,
  onUpdatePolicy
}) => {
  const [maxSingle, setMaxSingle] = useState(policy.maxSinglePurchaseLimit);
  const [dailyCap, setDailyCap] = useState(policy.dailySpendingLimit);
  const [currency, setCurrency] = useState(policy.preferredCurrency);
  const [minTrust, setMinTrust] = useState(policy.minMerchantTrustScore);
  const [allowlist, setAllowlist] = useState<string[]>(
    policy.merchantAllowlist || ['amazon.in', 'techdirect.store', 'proscreen.com', 'apple.com']
  );
  const [blocklist, setBlocklist] = useState<string[]>(
    policy.merchantBlocklist || ['scam-deals.xyz', 'sketchy-electronics.net']
  );
  const [newAllowDomain, setNewAllowDomain] = useState('');
  const [newBlockDomain, setNewBlockDomain] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const currencySymbol = AVAILABLE_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const dailySpentPercent = Math.min(100, Math.round((policy.currentDailySpent / dailyCap) * 100));
  const remainingBudget = Math.max(0, dailyCap - policy.currentDailySpent);

  const handleApplyPreset = (single: number, daily: number) => {
    setMaxSingle(single);
    setDailyCap(daily);
  };

  const handleAddAllowDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newAllowDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && !allowlist.includes(domain)) {
      setAllowlist([...allowlist, domain]);
      setNewAllowDomain('');
    }
  };

  const handleRemoveAllowDomain = (domainToRemove: string) => {
    setAllowlist(allowlist.filter(d => d !== domainToRemove));
  };

  const handleAddBlockDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newBlockDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && !blocklist.includes(domain)) {
      setBlocklist([...blocklist, domain]);
      setNewBlockDomain('');
    }
  };

  const handleRemoveBlockDomain = (domainToRemove: string) => {
    setBlocklist(blocklist.filter(d => d !== domainToRemove));
  };

  const handleSavePolicy = () => {
    const updated: UserFinancialPolicy = {
      ...policy,
      maxSinglePurchaseLimit: Number(maxSingle),
      dailySpendingLimit: Number(dailyCap),
      preferredCurrency: currency,
      minMerchantTrustScore: Number(minTrust),
      merchantAllowlist: allowlist,
      merchantBlocklist: blocklist
    };
    onUpdatePolicy(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-card overflow-hidden card-lift">
      {/* Executive Header Banner */}
      <div className="px-7 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-fintech-navy text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300 shadow-inner">
            <ScaleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base tracking-tight text-white">
                Spending Safeguards & Policy Governance
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-widest">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Deterministic checks enforced mathematically in minor integer units before cryptographic clearance
            </p>
          </div>
        </div>

        {savedNotice && (
          <span className="flex items-center space-x-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-500/40 shadow-xs animate-pulse">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
            <span>Policy Governance Committed!</span>
          </span>
        )}
      </div>

      <div className="p-7 space-y-7">
        {/* Luxury HUD Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Daily Buffer */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Daily Liquidity Buffer</span>
              <BanknotesIcon className="w-4 h-4 text-fintech-bright" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currencySymbol}{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span>Spent Today: {currencySymbol}{policy.currentDailySpent.toLocaleString()}</span>
              <span className="font-bold text-fintech-bright">{dailySpentPercent}% Cap</span>
            </div>
          </div>

          {/* Card 2: Single Transaction Ceiling */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Single Purchase Ceiling</span>
              <LockClosedIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currencySymbol}{maxSingle.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              Rejects any proposal exceeding this sum instantly
            </p>
          </div>

          {/* Card 3: Engine Verification State */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/20 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Policy Engine Guard</span>
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              Zero-Drift
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              Pure deterministic logic (never LLM heuristics)
            </p>
          </div>
        </div>

        {/* Dynamic Spend Runway Meter */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Today's Spending Runway</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {currencySymbol}{policy.currentDailySpent.toLocaleString()} / {currencySymbol}{dailyCap.toLocaleString()} ({100 - dailySpentPercent}% remaining)
            </span>
          </div>

          <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailySpentPercent > 85
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : dailySpentPercent > 50
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                  : 'bg-gradient-to-r from-fintech-bright to-cyan-400'
              }`}
              style={{ width: `${dailySpentPercent}%` }}
            />
          </div>

          {/* Quick Presets Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400">Quick Policy Presets:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(1000, 2500)}
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-fintech-bright bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition text-xs shadow-xs"
              >
                Prudent ($1k / $2.5k)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2500, 5000)}
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-fintech-bright bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition text-xs shadow-xs"
              >
                Executive ($2.5k / $5k)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(10000, 25000)}
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-fintech-bright bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition text-xs shadow-xs"
              >
                High Liquidity ($10k / $25k)
              </button>
            </div>
          </div>
        </div>

        {/* Currency & Ceilings Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Preferred Currency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Account Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-xs"
            >
              {AVAILABLE_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Single Cap Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Max Per-Purchase Cap
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-xs font-bold text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                value={maxSingle}
                onChange={(e) => setMaxSingle(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl pl-8 pr-4 py-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-xs"
              />
            </div>
          </div>

          {/* Daily Cap Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Total Daily Cap
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-xs font-bold text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl pl-8 pr-4 py-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Merchant Trust Filter Slider */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <ShieldCheckIcon className="w-4 h-4 text-fintech-bright" />
              <span>Minimum Merchant Trust Rating Threshold</span>
            </label>
            <span className="text-xs font-mono font-bold text-fintech-bright bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/40">
              {minTrust}% Trust Required
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={minTrust}
            onChange={(e) => setMinTrust(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fintech-bright"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>50% (Permissive)</span>
            <span>75% (Recommended)</span>
            <span>95% (Strict Institutional)</span>
          </div>
        </div>

        {/* Merchant Governance: Allowlists & Blocklists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Allowlist */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>Authorized Merchant Allowlist</span>
            </span>
            <div className="flex flex-wrap gap-2 min-h-[46px] p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
              {allowlist.length === 0 ? (
                <span className="text-xs text-slate-400 p-1">All verified merchants permitted</span>
              ) : (
                allowlist.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center space-x-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs px-3 py-1.5 rounded-full text-slate-800 dark:text-slate-100 font-semibold shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{domain}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowDomain(domain)}
                      className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <form onSubmit={handleAddAllowDomain} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. apple.com"
                value={newAllowDomain}
                onChange={(e) => setNewAllowDomain(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-xs"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-1 transition shadow-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Blocklist */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <AlertTriangleIcon className="w-4 h-4 text-rose-500" />
              <span>Restricted Merchant Blocklist</span>
            </span>
            <div className="flex flex-wrap gap-2 min-h-[46px] p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
              {blocklist.length === 0 ? (
                <span className="text-xs text-slate-400 p-1">No restricted merchants</span>
              ) : (
                blocklist.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs px-3 py-1.5 rounded-full text-rose-800 dark:text-rose-200 font-semibold shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{domain}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockDomain(domain)}
                      className="text-rose-400 hover:text-rose-700 ml-1 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
            <form onSubmit={handleAddBlockDomain} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. sketchy-deals.com"
                value={newBlockDomain}
                onChange={(e) => setNewBlockDomain(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-fintech-bright shadow-xs"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-1 transition shadow-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Block</span>
              </button>
            </form>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSavePolicy}
            className="bg-fintech-navy hover:bg-slate-950 text-white font-extrabold text-xs py-3.5 px-7 rounded-full shadow-pill transition duration-200 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-fintech-bright"
          >
            <CheckCircleIcon className="w-4 h-4 text-cyan-300" />
            <span>Commit Policy Governance</span>
          </button>
        </div>
      </div>
    </div>
  );
};

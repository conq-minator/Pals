import React from 'react';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  LockClosedIcon,
  InfoIcon
} from './Icons.js';
import { glyClient } from '../api/glyClient.js';

export const PayPalProtectionCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-card p-6 space-y-5 card-lift">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-[#0079C1]">
          <ShieldCheckIcon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
            PayPal Buyer Protection Guarantee
          </h4>
          <p className="text-[11px] text-slate-400">Institutional consumer safeguards</p>
        </div>
      </div>

      {/* 4 Core Guarantees Grid */}
      <div className="space-y-3 text-xs">
        <div className="flex items-start space-x-2.5">
          <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200 block">180-Day Dispute Coverage</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Full reimbursement if an item doesn't arrive or significantly diverges from the description.
            </span>
          </div>
        </div>

        <div className="flex items-start space-x-2.5">
          <LockClosedIcon className="w-4 h-4 text-[#0079C1] shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200 block">Cryptographic Zero-Drift Ceiling</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Your SHA-256 digital signature binds the maximum payable. Not even a $0.01 increase is allowed.
            </span>
          </div>
        </div>

        <div className="flex items-start space-x-2.5">
          <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200 block">0% Consumer Transaction Fees</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Zero checkout surcharges for domestic buyer orders funded via PayPal account or bank transfer.
            </span>
          </div>
        </div>

        <div className="flex items-start space-x-2.5">
          <InfoIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200 block">Zero Direct Secret Exposure</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              PayPal API credentials remain securely locked on backend servers—never in browser memory.
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={() => glyClient.sendChatMessage("What are PayPal's buyer protection guarantees and fee rules?")}
        className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-[#003087] dark:text-cyan-300 font-bold py-2.5 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-xs transition shadow-xs text-center block"
      >
        Ask Pali About PayPal Protection Policies
      </button>
    </div>
  );
};


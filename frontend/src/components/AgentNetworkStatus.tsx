import React, { useEffect, useState } from 'react';
import { glyClient, type PalHealth } from '../api/glyClient.js';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  RefreshCwIcon
} from './Icons.js';

type Receipt = { id: string; item: string; amount: string; status: string; date: string };

export const AgentNetworkStatus: React.FC = () => {
  // Live status from the PALS server's /healthz; receipts are real ones captured in this session.
  const [health, setHealth] = useState<PalHealth | null>(glyClient.getHealth());
  const [recentTransactions, setRecent] = useState<Receipt[]>([]);
  const simulated = glyClient.isSimulated();

  useEffect(() => glyClient.onHealth(setHealth), []);
  useEffect(
    () =>
      glyClient.onMessage((res) => {
        const r = res.paymentResult;
        if (!r || r.status !== 'COMPLETED') return;
        setRecent((prev) => [
          { id: r.receiptNumber, item: res.replyText.replace(/^Payment complete: /, ''), amount: `${r.currency} ${r.finalAmountCaptured.toFixed(2)}`, status: 'Captured', date: 'Just now' },
          ...prev
        ].slice(0, 5));
      }),
    []
  );

  const state = (id: keyof PalHealth, up: string) =>
    simulated ? 'SIMULATED' : health === null ? 'OFFLINE' : health[id] ? up : 'NOT CONFIGURED';
  const agents = [
    { id: 'GLY', name: 'GuidePal Gateway', role: 'Conversational RAG & Ingestion', status: state('GLY', 'ONLINE') },
    { id: 'ARB', name: 'ArbitrationPal', role: 'Finds deals and coupons', status: state('ARB', 'ONLINE') },
    { id: 'PULSE', name: 'PaymentPal', role: 'PayPal Order Capture Engine', status: state('PULSE', 'READY') },
    { id: 'DEFENDER', name: 'Security Defender', role: 'Pre-flight Threat & Limit Audit', status: state('DEFENDER', 'ENFORCING') },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-card p-6 space-y-5 card-lift">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
            System status
          </h4>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {simulated ? 'Simulated' : health ? `${Object.values(health).filter(Boolean).length}/4 online` : 'Offline'}
        </span>
      </div>

      {/* Agents Status Rows */}
      <div className="space-y-2.5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
          >
            <div className="flex items-center space-x-2.5">
              <span className="font-mono font-black text-[#0079C1] text-[11px] bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                {agent.id}
              </span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-none">
                  {agent.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{agent.role}</span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${['ONLINE', 'READY', 'ENFORCING'].includes(agent.status) ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/30' : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/30'}`}>
              {agent.status}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Ledger Activity */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recent receipts
          </span>
          <span className="text-[10px] text-slate-400 font-mono">This session</span>
        </div>

        <div className="space-y-2">
          {recentTransactions.length === 0 && (
            <p className="text-[11px] text-slate-400">No payments yet in this session. Ask Pali "show my transactions" for your PALS history.</p>
          )}
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 font-mono"
            >
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">{tx.item}</span>
                <span className="text-[10px] text-slate-400">{tx.id} • {tx.date}</span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{tx.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header.js';
import { AssistantBot } from './components/AssistantBot.js';
import { OfferPanel } from './components/OfferPanel.js';
import { PurchaseProposal } from './types/index.js';
import { glyClient } from './api/glyClient.js';

// Only for VITE_PALS_SIMULATE=true (offline UI work): a made-up offer to look at.
const SAMPLE: PurchaseProposal = {
  proposalId: 'prop_sample',
  taskId: 'tsk_sample',
  merchantName: 'Sample Store',
  merchantDomain: 'sample.store',
  checkoutUrl: 'https://sample.store',
  productTitle: 'Sample wireless earbuds',
  sku: 'SAMPLE-1',
  pricingBreakdown: { basePrice: 89, discountApplied: 10, shippingFee: 0, taxes: 0, totalPayable: 79, currency: 'USD' },
  negotiationLog: { attempted: true, successful: true, savingsAmount: 10, description: 'Coupon SAVE10 applied.' },
  merchantTrustScore: 90,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
} as PurchaseProposal;

const readLimit = (): number | null => {
  try {
    const v = Number(localStorage.getItem('pals_limit'));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
};

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('pals_theme');
      if (saved) return saved === 'dark';
    } catch { /* storage blocked */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [proposal, setProposal] = useState<PurchaseProposal | null>(glyClient.isSimulated() ? SAMPLE : null);
  const [limit, setLimit] = useState<number | null>(readLimit);
  const [offerHint, setOfferHint] = useState(false);
  const offerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('pals_theme', darkMode ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [darkMode]);

  const onProposal = useCallback((p: PurchaseProposal) => {
    setProposal(p);
    // On narrow screens the offer sits below the chat: offer a shortcut to it.
    if (window.matchMedia('(max-width: 1023px)').matches) setOfferHint(true);
  }, []);

  const saveLimit = (raw: string) => {
    const v = Number(raw);
    const next = v > 0 ? v : null;
    setLimit(next);
    try { next ? localStorage.setItem('pals_limit', String(next)) : localStorage.removeItem('pals_limit'); } catch { /* ignore */ }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-fintech-slate text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[calc(100dvh-6.5rem)] min-h-[440px] lg:h-[calc(100dvh-5.5rem)]">
          <AssistantBot onProposalReceived={onProposal} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[4.5rem] lg:self-start">
          <div ref={offerRef}>
            <OfferPanel proposal={proposal} limit={limit} />
          </div>

          <details className="group rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-card dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex cursor-pointer list-none items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Spending limit</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {limit ? `${proposal?.pricingBreakdown.currency ?? 'USD'} ${limit}` : 'None'}
                <span className="ml-2 text-xs font-normal text-fintech-bright group-open:hidden">Change</span>
              </span>
            </summary>
            <label htmlFor="limit" className="mt-3 block text-xs text-slate-500 dark:text-slate-400">
              Offers above this amount can't be approved. Leave empty for no limit.
            </label>
            <input
              id="limit"
              type="number"
              min={0}
              inputMode="decimal"
              defaultValue={limit ?? ''}
              onChange={(e) => saveLimit(e.target.value)}
              placeholder="No limit"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-fintech-bright focus:outline-none focus:ring-2 focus:ring-fintech-bright/30 dark:border-slate-700 dark:bg-slate-800"
            />
          </details>
        </aside>
      </main>

      {offerHint && (
        <button
          type="button"
          onClick={() => {
            offerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setOfferHint(false);
          }}
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-fintech-navy px-5 py-2.5 text-sm font-semibold text-white shadow-pill lg:hidden"
        >
          View your offer ↓
        </button>
      )}
    </div>
  );
};

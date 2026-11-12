import React, { useEffect, useState } from 'react';
import { PurchaseProposal, PulsePaymentResponse } from '../types/index.js';
import { glyClient, money, type PalHealth } from '../api/glyClient.js';
import { CheckCircleIcon, AlertTriangleIcon, LockClosedIcon, ShieldCheckIcon } from './Icons.js';

type Stage = 'review' | 'checking' | 'pay' | 'done' | 'failed';

/**
 * The offer the user is about to buy, and the real payment flow:
 * Approve -> DEFENDER check -> Pay with PayPal (PayPal's own page) -> receipt.
 */
export const OfferPanel: React.FC<{
  proposal: PurchaseProposal | null;
  limit: number | null;
  onPaid?: (r: PulsePaymentResponse) => void;
}> = ({ proposal, limit, onPaid }) => {
  const [stage, setStage] = useState<Stage>('review');
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PulsePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<PalHealth | null>(glyClient.getHealth());
  useEffect(() => glyClient.onHealth(setHealth), []);
  const paymentsOff = !glyClient.isSimulated() && health !== null && !health.PULSE;

  useEffect(() => {
    setStage('review');
    setPaypalUrl(null);
    setReceipt(null);
    setError(null);
  }, [proposal?.proposalId]);

  useEffect(() => {
    if (stage !== 'checking' && stage !== 'pay') return;
    return glyClient.onMessage((res) => {
      if (res.paypalApprovalUrl) {
        setPaypalUrl(res.paypalApprovalUrl);
        setStage('pay');
      } else if (res.paymentResult) {
        if (res.paymentResult.status === 'COMPLETED') {
          setReceipt(res.paymentResult);
          setStage('done');
          onPaid?.(res.paymentResult);
        } else {
          setError(res.replyText);
          setStage('failed');
        }
      } else if (res.intent === 'INTENT_PAYMENT_FAILED' || res.intent === 'INTENT_ERROR') {
        setError(res.replyText);
        setStage('failed');
      }
    });
  }, [stage, onPaid]);

  if (!proposal) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your offer</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ask the assistant to find something, then press <span className="font-medium">Get this ready</span> on a result. The offer appears here for you to approve.
        </p>
      </Card>
    );
  }

  const { pricingBreakdown: price } = proposal;
  const total = { value: price.totalPayable, currency: price.currency };
  const saved = price.discountApplied > 0 ? { value: price.discountApplied, currency: price.currency } : null;
  const overLimit = limit !== null && price.totalPayable > limit;
  const expires = new Date(proposal.expiresAt);
  const expired = expires.getTime() < Date.now();

  const approve = async () => {
    setError(null);
    setStage('checking');
    const token = await glyClient.generateUserApprovalToken(proposal);
    const res = await glyClient.submitApproval(token, proposal);
    // Offline simulator answers at once; the live server answers through onMessage.
    if (res.paymentResult?.status === 'COMPLETED') {
      setReceipt(res.paymentResult);
      setStage('done');
      onPaid?.(res.paymentResult);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your offer</h2>
        {!expired && stage === 'review' && (
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            valid until {expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{proposal.productTitle}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{proposal.merchantName}</p>

      <dl className="mt-3 space-y-1 text-sm">
        {saved && (
          <>
            <Row label="Price" value={money({ value: price.basePrice, currency: price.currency })} />
            <Row label="Discount" value={`− ${money(saved)}`} accent />
          </>
        )}
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
          <dt className="text-slate-500 dark:text-slate-400">Total</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-white">{money(total)}</dd>
        </div>
      </dl>
      {proposal.negotiationLog?.successful && (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{proposal.negotiationLog.description}</p>
      )}

      <div className="mt-4 space-y-2">
        {stage === 'review' &&
          (expired ? (
            <Notice tone="warn">This offer has expired. Ask the assistant to get it ready again for a fresh price.</Notice>
          ) : paymentsOff ? (
            <Notice tone="warn">Payments aren't set up on this server yet, so this offer can't be paid. Everything else works.</Notice>
          ) : overLimit ? (
            <Notice tone="warn">This is over your spending limit of {money({ value: limit!, currency: price.currency })}. Raise the limit below to approve it.</Notice>
          ) : (
            <button
              type="button"
              onClick={approve}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-fintech-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              <LockClosedIcon className="h-4 w-4" /> Approve {money(total)}
            </button>
          ))}

        {stage === 'checking' && (
          <Notice tone="info">
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Running the security check…
            </span>
          </Notice>
        )}

        {stage === 'pay' && paypalUrl && (
          <>
            <a
              href={paypalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-full bg-[#FFC439] px-4 py-3 text-center text-sm font-bold text-slate-900 transition hover:bg-[#f2b72f]"
            >
              Pay with PayPal
            </a>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">Security check passed. You'll confirm on PayPal's own page.</p>
          </>
        )}

        {stage === 'done' && receipt && (
          <Notice tone="ok">
            <span className="flex items-center gap-2 font-semibold"><CheckCircleIcon className="h-4 w-4" /> Paid {money({ value: receipt.finalAmountCaptured, currency: receipt.currency })}</span>
            <span className="mt-0.5 block text-xs">Receipt {receipt.receiptNumber}</span>
          </Notice>
        )}

        {stage === 'failed' && (
          <>
            <Notice tone="warn">{error ?? 'The payment did not go through. Nothing was charged.'}</Notice>
            <button type="button" onClick={() => setStage('review')} className="w-full text-xs text-slate-500 underline hover:text-fintech-bright dark:text-slate-400">
              Back to the offer
            </button>
          </>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheckIcon className="h-3.5 w-3.5 text-fintech-bright" /> Nothing is charged until you confirm on PayPal.
      </p>
    </Card>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</section>
);

const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex justify-between">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={accent ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>{value}</dd>
  </div>
);

const Notice: React.FC<{ tone: 'info' | 'ok' | 'warn'; children: React.ReactNode }> = ({ tone, children }) => {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100',
    warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
  }[tone];
  return (
    <div className={`flex gap-2 rounded-xl border p-3 text-sm ${styles}`}>
      {tone === 'warn' && <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
};

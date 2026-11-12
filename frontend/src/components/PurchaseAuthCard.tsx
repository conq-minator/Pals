import React, { useState, useEffect } from 'react';
import {
  PurchaseProposal,
  UserApprovalToken,
  PulsePaymentResponse
} from '../types/index.js';
import { glyClient } from '../api/glyClient.js';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
  BanknotesIcon
} from './Icons.js';

interface PurchaseAuthCardProps {
  proposal: PurchaseProposal | null;
  onTokenGenerated?: (token: UserApprovalToken) => void;
  onPaymentComplete?: (result: PulsePaymentResponse) => void;
  onAskGlyToNegotiate?: () => void;
}

export const PurchaseAuthCard: React.FC<PurchaseAuthCardProps> = ({
  proposal,
  onTokenGenerated,
  onPaymentComplete,
  onAskGlyToNegotiate
}) => {
  const [isSigning, setIsSigning] = useState(false);
  const [approvalToken, setApprovalToken] = useState<UserApprovalToken | null>(null);
  const [paymentResult, setPaymentResult] = useState<PulsePaymentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState<string | null>(null);

  // A new offer resets the card.
  useEffect(() => {
    setApprovalToken(null);
    setPaymentResult(null);
    setErrorMessage(null);
    setPaypalUrl(null);
    setAwaiting(null);
  }, [proposal?.proposalId]);

  // The real flow is asynchronous: after Approve, DEFENDER checks it, PULSE creates the PayPal
  // order (link arrives), the buyer pays on PayPal, and the receipt arrives later.
  useEffect(() => {
    return glyClient.onMessage((res) => {
      if (!awaiting) return;
      if (res.paypalApprovalUrl) {
        setPaypalUrl(res.paypalApprovalUrl);
        setAwaiting('Waiting for you to approve the payment on PayPal…');
      } else if (res.paymentResult) {
        setAwaiting(null);
        if (res.paymentResult.status === 'COMPLETED') {
          setPaymentResult(res.paymentResult);
          onPaymentComplete?.(res.paymentResult);
        } else {
          setErrorMessage(res.replyText);
        }
      } else if (res.intent === 'INTENT_PAYMENT_FAILED' || res.intent === 'INTENT_ERROR') {
        setAwaiting(null);
        setErrorMessage(res.replyText);
      }
    });
  }, [awaiting, onPaymentComplete]);

  if (!proposal) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 shadow-card flex flex-col items-center justify-center text-center min-h-[440px] transition card-lift">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/70 text-fintech-bright flex items-center justify-center mb-4 shadow-inner border border-blue-100 dark:border-blue-900/40">
          <ShieldCheckIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Purchase Clearance & Authorization
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          Select any verified deal above or ask Gly in chat. Once ARB concludes price arbitration, an itemized private-banking authorization certificate will appear here.
        </p>
        <button
          onClick={() => glyClient.sendChatMessage("Find me a MacBook Air under $1300")}
          className="text-xs font-bold text-fintech-bright hover:text-fintech-vibrant bg-blue-50 dark:bg-blue-950/60 px-6 py-3 rounded-full border border-blue-200 dark:border-blue-800/60 transition shadow-xs"
        >
          💡 Request Deal: "Find me a MacBook Air under $1300"
        </button>
      </div>
    );
  }

  const { pricingBreakdown, merchantName, merchantDomain, merchantTrustScore, productTitle, variant, negotiationLog } = proposal;
  const currencySymbol = pricingBreakdown.currency === 'INR' ? '₹' : '$';

  const formatAmount = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAuthorize = async () => {
    try {
      setIsSigning(true);
      setErrorMessage(null);

      // Step 1: Explicitly generate canonical UserApprovalToken
      const token = await glyClient.generateUserApprovalToken(proposal);
      setApprovalToken(token);
      onTokenGenerated?.(token);

      // Step 2: Transmit exclusively to GLY Gateway (never direct to PULSE or ARB)
      const res = await glyClient.submitApproval(token, proposal);
      if (res.intent === 'INTENT_APPROVAL_SENT') setAwaiting('DEFENDER is checking this payment…');

      if (res.paymentResult && res.paymentResult.status === 'COMPLETED') {
        setPaymentResult(res.paymentResult);
        onPaymentComplete?.(res.paymentResult);
      } else if (res.intent === 'INTENT_PAYMENT_BLOCKED' || res.intent === 'INTENT_PAYMENT_FAILED') {
        setErrorMessage(res.replyText);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to authorize transaction');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-card overflow-hidden transition-all duration-300 card-lift">
      {/* Executive Certificate Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-fintech-deep px-7 py-5 text-white flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-cyan-300 border border-white/20">
            <LockClosedIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs tracking-wider uppercase block text-cyan-300">
              Cryptographic Purchase Authorization Certificate
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Ref: {proposal.proposalId}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trust Rating: {merchantTrustScore}%</span>
          </span>
        </div>
      </div>

      <div className="p-7 space-y-6">
        {/* Merchant & Title Statement */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Arbitrated Item & Merchant
            </div>
            <h3 className="font-black text-slate-900 dark:text-slate-50 text-xl leading-tight">
              {productTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap items-center gap-2">
              <span>Merchant Entity:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{merchantName}</span>
              <span className="text-slate-400">({merchantDomain})</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 text-[10px]">
                Verified Gateway
              </span>
            </p>

            {variant && (variant.color || variant.specs) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {variant.color && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-medium">
                    Finish: {variant.color}
                  </span>
                )}
                {variant.specs && Object.entries(variant.specs).map(([key, val]) => (
                  <span key={key} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-medium">
                    {key}: {val}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auto-Negotiated Savings Banner */}
        {negotiationLog?.successful && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-950 dark:text-amber-100">
            <SparklesIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Auto-Arbitrated Concession: </span>
              {negotiationLog.description} (Savings realized: <strong>{formatAmount(negotiationLog.savingsAmount)}</strong>)
            </div>
          </div>
        )}

        {/* Landed Cost Breakdown Statement */}
        <div className="bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <span>Itemized Line Item</span>
            <span>Subtotal</span>
          </div>

          <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
            <span>Base Merchant Price</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatAmount(pricingBreakdown.basePrice)}</span>
          </div>

          {pricingBreakdown.discountApplied > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold">
              <span>Arbitrated Promotional Rebate</span>
              <span>-{formatAmount(pricingBreakdown.discountApplied)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
            <span>Insured Expedited Courier Shipping</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {pricingBreakdown.shippingFee === 0 ? 'Complimentary (FREE)' : formatAmount(pricingBreakdown.shippingFee)}
            </span>
          </div>

          <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
            <span>Estimated Statutory Taxes & Regulatory Fees</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatAmount(pricingBreakdown.taxes)}</span>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700 flex justify-between items-baseline">
            <div>
              <span className="text-base font-black text-slate-900 dark:text-white">Total Landed Amount</span>
              <p className="text-[11px] text-slate-400 font-mono">Guaranteed maximum ceiling (0 overage permitted)</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-fintech-bright">
                {formatAmount(pricingBreakdown.totalPayable)}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono uppercase">
                Currency: {pricingBreakdown.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex items-start space-x-3 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {awaiting && !paymentResult && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-100 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{awaiting}</span>
            </div>
            {paypalUrl && (
              <a
                href={paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#FFC439] hover:bg-[#f2b72f] text-slate-900 font-extrabold py-3 rounded-full text-sm"
              >
                Pay with PayPal
              </a>
            )}
          </div>
        )}

        {/* Status Confirmation or Action Buttons */}
        {paymentResult && paymentResult.status === 'COMPLETED' ? (
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/30 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-6 text-emerald-950 dark:text-emerald-100 space-y-3 shadow-xs">
            <div className="flex items-center space-x-3 font-black text-base text-emerald-800 dark:text-emerald-300">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
              <span>Purchase Authorized & Secured via PayPal</span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 pt-1 font-mono">
              <p>Institutional Receipt ID: <span className="font-bold text-slate-900 dark:text-white">{paymentResult.receiptNumber}</span></p>
              <p>PayPal Order ID: <span className="font-bold text-slate-900 dark:text-white">{paymentResult.paypalOrderId}</span></p>
              <p>Final Settlement: <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatAmount(paymentResult.finalAmountCaptured)}</span></p>
            </div>
            <div className="pt-2 flex items-center space-x-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
              <span>Backed by 180-Day PayPal Buyer Protection Guarantee</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Primary Dark Pill Button */}
            <button
              onClick={handleAuthorize}
              disabled={isSigning || !!awaiting}
              className="w-full bg-slate-950 hover:bg-black text-white font-extrabold py-4 px-6 rounded-full shadow-pill transition duration-200 flex items-center justify-center space-x-2.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-fintech-bright"
            >
              {isSigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing SHA-256 Token & Validating Policy...</span>
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-4 h-4 text-cyan-300" />
                  <span>Cryptographically Authorize & Sign — {formatAmount(pricingBreakdown.totalPayable)}</span>
                </>
              )}
            </button>

            {/* Light Secondary Button */}
            <button
              type="button"
              onClick={onAskGlyToNegotiate}
              className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-xs transition shadow-xs"
            >
              Consult Gly for Alternate Merchant Rebates
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                🔒 Generates canonical UserApprovalToken • Exclusively routed via GLY gateway
              </span>
            </div>
          </div>
        )}

        {/* Cryptographic Signature Ribbon */}
        {approvalToken && (
          <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="font-bold">Token ID: {approvalToken.approvalToken}</span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-fintech-bright px-2.5 py-0.5 rounded-full font-bold">
                SHA-256 Verified
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-1">
              Signature: {approvalToken.userSignature}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

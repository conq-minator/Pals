import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { AssistantBot } from './components/AssistantBot.js';
import { PurchaseAuthCard } from './components/PurchaseAuthCard.js';
import { SpendingDashboard } from './components/SpendingDashboard.js';
import { PayPalProtectionCard } from './components/PayPalProtectionCard.js';
import { AgentNetworkStatus } from './components/AgentNetworkStatus.js';
import { Confetti } from './components/Confetti.js';
import { PaliAvatar } from './components/GlyAvatar.js';
import { PaliFloatingHelper } from './components/PaliFloatingHelper.js';
import {
  PurchaseProposal,
  UserFinancialPolicy,
  PulsePaymentResponse,
  DeterministicPolicyEngine
} from './types/index.js';
import { glyClient } from './api/glyClient.js';
import {
  SparklesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockClosedIcon,
  ArrowRightIcon,
  PayPalMonogram
} from './components/Icons.js';

// Pre-seeded verified purchase proposal samples for demonstration and instant testing
const SAMPLE_PROPOSALS: Record<string, PurchaseProposal> = {
  macbook: {
    proposalId: 'prop_mba_m3_2026',
    taskId: 'tsk_arb_macbook_01',
    merchantName: 'TechDirect Electronics',
    merchantDomain: 'techdirect.store',
    checkoutUrl: 'https://techdirect.store/checkout/macbook-air-m3',
    productTitle: 'Apple MacBook Air 13.6" (M3 Chip, 16GB RAM, 512GB SSD)',
    sku: 'APL-MBA13-M3-16-512',
    variant: {
      color: 'Midnight Blue',
      specs: { RAM: '16GB', Storage: '512GB', Chip: 'Apple M3' }
    },
    pricingBreakdown: {
      basePrice: 1199.00,
      discountApplied: 50.00,
      shippingFee: 0,
      taxes: 91.92,
      totalPayable: 1240.92,
      currency: 'USD'
    },
    negotiationLog: {
      attempted: true,
      successful: true,
      savingsAmount: 50.00,
      description: 'ARB automatically negotiated $50 instant merchant coupon and free express delivery.'
    },
    merchantTrustScore: 94,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  },
  monitor: {
    proposalId: 'prop_dell_4k_2026',
    taskId: 'tsk_arb_monitor_02',
    merchantName: 'ProScreen Superstore',
    merchantDomain: 'proscreen.com',
    checkoutUrl: 'https://proscreen.com/buy/dell-u2723qe',
    productTitle: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
    sku: 'DELL-U2723QE-4K',
    variant: {
      color: 'Platinum Silver',
      specs: { Resolution: '3840 x 2160', Panel: 'IPS Black', USB_C: '90W PD' }
    },
    pricingBreakdown: {
      basePrice: 579.99,
      discountApplied: 30.00,
      shippingFee: 15.00,
      taxes: 45.20,
      totalPayable: 610.19,
      currency: 'USD'
    },
    negotiationLog: {
      attempted: true,
      successful: true,
      savingsAmount: 30.00,
      description: 'ARB applied seasonal creator promotional rebate code.'
    },
    merchantTrustScore: 89,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  },
  overBudget: {
    proposalId: 'prop_luxury_rig_99',
    taskId: 'tsk_arb_luxury_03',
    merchantName: 'HighEnd Rig Builders',
    merchantDomain: 'custompc.net',
    checkoutUrl: 'https://custompc.net/order/extreme-workstation',
    productTitle: 'Custom AI Deep Learning Workstation (Dual RTX 4090, 128GB RAM)',
    sku: 'WRKSTN-AI-EXTREME',
    variant: {
      specs: { GPU: '2x NVIDIA RTX 4090 24GB', CPU: 'AMD Threadripper 7980X' }
    },
    pricingBreakdown: {
      basePrice: 8500.00,
      discountApplied: 0,
      shippingFee: 150.00,
      taxes: 692.00,
      totalPayable: 9342.00,
      currency: 'USD'
    },
    merchantTrustScore: 85,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }
};

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // User financial policy state
  const [policy, setPolicy] = useState<UserFinancialPolicy>({
    userId: 'usr_pals_shopper_01',
    maxSinglePurchaseLimit: 2500,
    dailySpendingLimit: 5000,
    currentDailySpent: 450,
    preferredCurrency: 'USD',
    merchantAllowlist: ['amazon.in', 'techdirect.store', 'proscreen.com', 'apple.com'],
    merchantBlocklist: ['scam-deals.xyz', 'sketchy-electronics.net'],
    minMerchantTrustScore: 80
  });

  // Active purchase proposal currently loaded
  const [activeProposal, setActiveProposal] = useState<PurchaseProposal | null>(SAMPLE_PROPOSALS.macbook);
  const [isApproved, setIsApproved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleProposalReceived = (proposal: PurchaseProposal) => {
    setActiveProposal(proposal);
    setIsApproved(false);
  };

  const handlePaymentComplete = (result: PulsePaymentResponse) => {
    setIsApproved(true);
    setShowConfetti(true);
    setPolicy((prev) => ({
      ...prev,
      currentDailySpent: prev.currentDailySpent + result.finalAmountCaptured
    }));
  };

  // Pre-flight check before proposal display
  const policyCheck = activeProposal
    ? DeterministicPolicyEngine.validateProposalAgainstPolicy(activeProposal, policy)
    : { valid: true, code: 'OK' as const, reason: undefined as string | undefined };

  const scrollToApp = () => {
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-serif transition-colors duration-200">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      <Header
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onNavClick={(view) => {
          if (view === 'limits') {
            document.getElementById('spending-section')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            scrollToApp();
          }
        }}
      />

      {/* LANDING PAGE HERO: PALI IS THE CENTERED HERO */}
      <section className="relative overflow-hidden fintech-mesh-bg text-white pt-16 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Soft background aura glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
          {/* Centered Pali Mascot Hero with Speech Bubble */}
          <div className="flex flex-col items-center justify-center">
            <PaliAvatar
              size="hero"
              mood={isApproved ? 'celebrating' : 'happy'}
              showSpeechBubble={true}
              speechText="Hi, I'm Pali 👋 I'll keep your PayPal agent payments safe"
            />
          </div>

          {/* Product Title & Friendly Pitch */}
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white border border-white/25 shadow-xs">
              <PayPalMonogram className="w-3.5 h-4 text-cyan-300" />
              <span>PayPal Agent Guard • Autonomous Commerce Companion</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Friendly AI assistance. Zero surprise charges.
            </h1>

            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              I explain every penny in plain language, keep your budget ceilings strictly locked with cryptographic tokens, and never let merchants overcharge.
            </p>
          </div>

          {/* Centered Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <button
              onClick={scrollToApp}
              className="bg-slate-950 hover:bg-black text-white font-black text-sm sm:text-base px-8 py-4 rounded-full shadow-pill transition duration-200 flex items-center space-x-2.5"
            >
              <span>Explore Deals with Pali</span>
              <ArrowRightIcon className="w-4 h-4 text-cyan-300" />
            </button>

            <button
              onClick={() => {
                glyClient.sendChatMessage("What are PayPal's buyer protection guarantees and fee rules?");
                scrollToApp();
              }}
              className="bg-white/95 hover:bg-white text-fintech-deep font-bold text-sm sm:text-base px-7 py-4 rounded-full border border-white shadow-card transition duration-200"
            >
              How Protection Works
            </button>
          </div>

          {/* Trust Guarantees Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-blue-100">
            <span className="flex items-center space-x-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-cyan-300" />
              <span>180-Day PayPal Protection</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <LockClosedIcon className="w-4 h-4 text-cyan-300" />
              <span>Deterministic Budget Ceilings</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>SHA-256 Signed Clearance</span>
            </span>
          </div>
        </div>
      </section>

      {/* INNER PAGES WORKSPACE */}
      <main id="workspace" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16 space-y-8 relative z-20">
        {/* Deal Selector Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3 card-lift">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 mr-1 flex items-center space-x-1.5">
              <SparklesIcon className="w-4 h-4 text-fintech-bright" />
              <span>Active Deal Terminal:</span>
            </span>
            <button
              onClick={() => {
                setActiveProposal(SAMPLE_PROPOSALS.macbook);
                setIsApproved(false);
              }}
              className={`px-4 py-2 rounded-full font-bold transition shadow-xs ${
                activeProposal?.proposalId === SAMPLE_PROPOSALS.macbook.proposalId
                  ? 'bg-fintech-bright text-white shadow-pill'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              💻 MacBook Air ($1,240.92)
            </button>
            <button
              onClick={() => {
                setActiveProposal(SAMPLE_PROPOSALS.monitor);
                setIsApproved(false);
              }}
              className={`px-4 py-2 rounded-full font-bold transition shadow-xs ${
                activeProposal?.proposalId === SAMPLE_PROPOSALS.monitor.proposalId
                  ? 'bg-fintech-bright text-white shadow-pill'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🖥️ 4K Hub Monitor ($610.19)
            </button>
            <button
              onClick={() => {
                setActiveProposal(SAMPLE_PROPOSALS.overBudget);
                setIsApproved(false);
              }}
              className={`px-4 py-2 rounded-full font-bold transition shadow-xs ${
                activeProposal?.proposalId === SAMPLE_PROPOSALS.overBudget.proposalId
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ⚠️ Over-Budget Rig ($9,342.00)
            </button>
          </div>

          <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5 font-mono">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
            <span>Deterministic Enforcement</span>
          </div>
        </div>

        {/* Policy Invariant Warning Banner if proposal violates deterministic constraints */}
        {activeProposal && !policyCheck.valid && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-3xl p-5 flex items-start space-x-3.5 text-xs text-rose-900 dark:text-rose-200 shadow-sm animate-pulse">
            <AlertTriangleIcon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-extrabold text-sm block">Policy Constraint Triggered ({policyCheck.code}):</span>
              <p className="leading-relaxed">{policyCheck.reason}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                The user-defined budget ceiling strictly rejects this checkout attempt. Adjust your spending ceiling in the dashboard below to authorize.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Workspace: Perfectly Balanced with Zero Empty Space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Assistant + Protection Card + Autonomous Agent Network */}
          <div className="lg:col-span-5 w-full space-y-8">
            {/* Pali Assistant Window */}
            <AssistantBot
              onProposalReceived={handleProposalReceived}
              activeProposal={activeProposal}
              onTriggerApproval={() => {
                document.getElementById('auth-card-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenLimits={() => {
                document.getElementById('spending-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              isApproved={isApproved}
              onCelebrate={() => setShowConfetti(true)}
            />

            {/* Official PayPal Protection Card */}
            <div id="protection-card-section">
              <PayPalProtectionCard />
            </div>

            {/* Autonomous Multi-Agent Network Clearance Ledger */}
            <div id="network-status-section">
              <AgentNetworkStatus />
            </div>
          </div>

          {/* Right Column: Purchase Authorization Card & Spending Dashboard */}
          <div className="lg:col-span-7 w-full space-y-8">
            <div id="auth-card-section">
              <PurchaseAuthCard
                proposal={activeProposal}
                onPaymentComplete={handlePaymentComplete}
                onAskGlyToNegotiate={() => {
                  glyClient.sendChatMessage("Pali, can you check if there are any other promotional codes for this merchant?");
                }}
              />
            </div>

            <div id="spending-section">
              <SpendingDashboard
                policy={policy}
                onUpdatePolicy={setPolicy}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Floating Chat Bubble in Bottom-Right */}
      <PaliFloatingHelper
        onProposalReceived={handleProposalReceived}
        activeProposal={activeProposal}
        onTriggerApproval={() => {
          document.getElementById('auth-card-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenLimits={() => {
          document.getElementById('spending-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        isApproved={isApproved}
        onCelebrate={() => setShowConfetti(true)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 justify-center md:justify-start">
              <PayPalMonogram className="w-5 h-6" />
              <span className="font-extrabold text-[#003087] dark:text-white text-base">
                Pay<span className="text-[#0079C1]">Pal</span> <span className="font-normal text-xs text-slate-400">Agent Guard</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic Safety Invariant: Exclusively routed via GLY • Zero client credentials stored • Cryptographic SHA-256 UserApprovalToken
            </p>
          </div>
          <div className="flex items-center space-x-6 text-xs font-semibold">
            <span className="flex items-center space-x-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-fintech-bright" />
              <span>Grounded PayPal RAG</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              <span>180-Day Protection</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Offline stand-in for GLY, used ONLY when VITE_PALS_SIMULATE=true (UI work without a backend).
 * Everything here is made up: products, prices, PayPal IDs and receipts. Never use it for a demo
 * that claims real payments.
 */
import {
  InboundChatMessageRequest,
  PurchaseProposal,
  UserApprovalToken,
  TaskLifecycleEvent,
  PulsePaymentResponse,
  DeterministicPolicyEngine
} from '../types/index.js';
import type { GlyChatResponse } from './glyClient.js';

export interface SimulatorIO {
  conversationId: string;
  emitMessage: (r: GlyChatResponse) => void;
  emitTask: (e: TaskLifecycleEvent) => void;
}

export class GlySimulator {
  constructor(private io: SimulatorIO) {}

  /**
   * Simulates GLY conversational logic identical to GLY/index.ts
   */
  public async simulateGlyResponse(request: InboundChatMessageRequest): Promise<GlyChatResponse> {
    const lower = request.content.toLowerCase();

    // PayPal Knowledge Guidance (RAG)
    if (lower.includes('fee') || lower.includes('buyer protection') || lower.includes('dispute') || lower.includes('hold') || lower.includes('policy')) {
      const isFee = lower.includes('fee');
      const isDispute = lower.includes('dispute') || lower.includes('hold');

      const response: GlyChatResponse = {
        replyText: isFee
          ? "According to official PayPal documentation, standard domestic consumer purchases have 0% transaction fees for buyers. For cross-border transactions, currency conversion spreads typically range between 3.0% and 4.0% above wholesale exchange rates."
          : isDispute
          ? "PayPal Buyer Protection covers eligible purchases if an item doesn't arrive or doesn't match the seller's description. You have 180 days from the payment date to open a dispute in the Resolution Center."
          : "PayPal Buyer Protection gives you peace of mind with 100% protection against unauthorized payments sent from your account, and end-to-end cryptographic encryption.",
        intent: 'INTENT_PAYPAL_GUIDANCE',
        references: [
          {
            documentId: isFee ? 'PAYPAL_FEES_POLICY' : 'BUYER_PROTECTION_OVERVIEW',
            title: isFee ? 'PayPal Consumer Fee Schedule' : 'PayPal Buyer Protection Guarantees',
            url: isFee ? 'docs/knowledge/paypal/fees.md' : 'docs/knowledge/paypal/buyer_protection.md',
            contentSnippet: isFee
              ? 'No transaction fees for eligible purchases funded by bank account or PayPal balance. International conversion spreads apply.'
              : 'Reimbursement coverage for eligible goods not received or significantly not as described.',
            score: 0.96,
            section: 'General Terms'
          }
        ]
      };

      // Notify listeners asynchronously to mirror network tick
      setTimeout(() => {
        this.io.emitMessage(response);
      }, 350);

      return response;
    }

    // Shopping / Research Intent -> Triggers ARB background task simulation
    if (lower.includes('buy') || lower.includes('find') || lower.includes('laptop') || lower.includes('macbook') || lower.includes('price') || lower.includes('deal') || lower.includes('recommend')) {
      const taskId = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const budgetMatch = request.content.match(/under\s+(?:₹|\$|rs\.?|inr\s*)?([0-9,]+)/i);
      const budget = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : 1299;
      const currency = lower.includes('₹') || lower.includes('inr') ? 'INR' : 'USD';

      // 1. Immediate Non-Blocking GLY Acknowledgment
      const initialReply: GlyChatResponse = {
        replyText: `Looking for deals under ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()}…`,
        intent: 'INTENT_SHOPPING_RESEARCH',
        delegatedTaskId: taskId
      };

      setTimeout(() => {
        this.io.emitMessage(initialReply);
      }, 300);

      // 2. Stream out-of-band task lifecycle event (ARB researching)
      setTimeout(() => {
        const researchEvent: TaskLifecycleEvent = {
          eventId: `evt_${Date.now()}`,
          taskId,
          conversationId: request.conversationId,
          targetPal: 'ARB',
          status: 'RESEARCHING',
          progressPercent: 45,
          statusMessage: 'Comparing merchants…',
          emittedAt: new Date().toISOString()
        };
        this.io.emitTask(researchEvent);
      }, 1200);

      // 3. Task Completion with PurchaseProposal
      setTimeout(() => {
        const proposal: PurchaseProposal = {
          proposalId: `prop_${Date.now().toString(36)}`,
          taskId,
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
            basePrice: currency === 'INR' ? 114900 : 1199.00,
            discountApplied: currency === 'INR' ? 5000 : 50.00,
            shippingFee: 0,
            taxes: currency === 'INR' ? 19782 : 91.92,
            totalPayable: currency === 'INR' ? 129682 : 1240.92,
            currency
          },
          negotiationLog: {
            attempted: true,
            successful: true,
            savingsAmount: currency === 'INR' ? 5000 : 50.00,
            description: 'Coupon WELCOME50 applied.'
          },
          merchantTrustScore: 94,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };

        const completedTask: TaskLifecycleEvent = {
          eventId: `evt_done_${Date.now()}`,
          taskId,
          conversationId: request.conversationId,
          targetPal: 'ARB',
          status: 'COMPLETED',
          progressPercent: 100,
          statusMessage: 'Offer ready',
          resultPayload: proposal as unknown as Record<string, unknown>,
          emittedAt: new Date().toISOString()
        };

        this.io.emitTask(completedTask);

        const proposalReply: GlyChatResponse = {
          replyText: `Your offer is ready. Check it in the offer panel.`,
          intent: 'INTENT_PURCHASE_CONFIRMATION',
          purchaseProposal: proposal
        };

        this.io.emitMessage(proposalReply);
      }, 2600);

      return initialReply;
    }

    // General Greeting & Capabilities
    const defaultReply: GlyChatResponse = {
      replyText: "Hi! I'm GLY, your friendly shopping & payment guide. I can help you search the best verified deals across merchants, review PayPal buyer protections and fee rules, or configure your personal spending safety limits. How can I help you today? ✨",
      intent: 'INTENT_GENERAL_DIALOGUE'
    };

    setTimeout(() => {
      this.io.emitMessage(defaultReply);
    }, 200);

    return defaultReply;
  }

  /**
   * Simulates payment authorization, pre-flight policy evaluation, DEFENDER audit, and PULSE execution
   */
  public async simulateApprovalExecution(
    approvalToken: UserApprovalToken,
    proposal: PurchaseProposal
  ): Promise<GlyChatResponse> {
    // 1. Deterministic Token Validation
    const validation = DeterministicPolicyEngine.validateApprovalTokenForPayment(
      approvalToken,
      proposal.pricingBreakdown.totalPayable,
      proposal.pricingBreakdown.currency,
      proposal.merchantDomain
    );

    if (!validation.valid) {
      const failResponse: GlyChatResponse = {
        replyText: `Policy engine validation failed: ${validation.reason}. Approval rejected.`,
        intent: 'INTENT_PAYMENT_BLOCKED'
      };
      this.io.emitMessage(failResponse);
      return failResponse;
    }

    // 2. Emulate DEFENDER & PULSE via GLY
    const paymentResult: PulsePaymentResponse = {
      paymentRequestId: `payreq_${Date.now().toString(36)}`,
      paypalOrderId: `PAYID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      paypalCaptureId: `CAP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      status: 'COMPLETED',
      finalAmountCaptured: proposal.pricingBreakdown.totalPayable,
      currency: proposal.pricingBreakdown.currency,
      receiptNumber: `RCPT-${Date.now().toString().slice(-6)}`,
      transactionTimestamp: new Date().toISOString(),
      paypalFee: Number((proposal.pricingBreakdown.totalPayable * 0.029 + 0.30).toFixed(2))
    };

    const successResponse: GlyChatResponse = {
      replyText: `Payment successfully captured via PayPal! 🎉 Receipt #${paymentResult.receiptNumber}. PayPal Order ID: ${paymentResult.paypalOrderId}. Your purchase from ${proposal.merchantName} is secured under PayPal Buyer Protection!`,
      intent: 'INTENT_PAYMENT_COMPLETED',
      paymentResult
    };

    // Emit task completion event
    const paymentTask: TaskLifecycleEvent = {
      eventId: `evt_pay_${Date.now()}`,
      taskId: proposal.taskId,
      conversationId: this.io.conversationId,
      targetPal: 'PULSE',
      status: 'COMPLETED',
      progressPercent: 100,
      statusMessage: `Payment captured: ${paymentResult.finalAmountCaptured} ${paymentResult.currency}`,
      resultPayload: paymentResult as unknown as Record<string, unknown>,
      emittedAt: new Date().toISOString()
    };

    this.io.emitTask(paymentTask);

    this.io.emitMessage(successResponse);

    return successResponse;
  }

}

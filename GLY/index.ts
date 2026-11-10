import fs from 'node:fs';
import path from 'node:path';
import {
  InboundChatMessageRequest,
  PayPalKnowledgeQuery,
  PayPalKnowledgeResponse,
  PayPalKnowledgeReference,
  PalCallEnvelope,
  ARBResearchPayload,
  ARBResearchResult,
  PurchaseProposal,
  PulsePaymentRequest,
  PulsePaymentResponse,
  UserApprovalToken
} from '../shared/types/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { TaskManager } from '../shared/tasks/index.js';
import { SharedLLMGateway } from '../shared/llm/index.js';
import { PalsLogger } from '../shared/logging/index.js';

export interface GlyChatResponse {
  replyText: string;
  intent: string;
  delegatedTaskId?: string;
  purchaseProposal?: PurchaseProposal;
  paymentResult?: PulsePaymentResponse;
  references?: PayPalKnowledgeReference[];
}

export class GlyService {
  private logger = new PalsLogger('GLY');
  private callsSystem: CentralCallsSystem;
  private taskManager: TaskManager;
  private llmGateway: SharedLLMGateway;
  private knowledgeDocs: Array<{ title: string; category: string; content: string }> = [];

  constructor(
    taskManager: TaskManager,
    callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance(),
    llmGateway: SharedLLMGateway = SharedLLMGateway.getInstance()
  ) {
    this.taskManager = taskManager;
    this.callsSystem = callsSystem;
    this.llmGateway = llmGateway;

    this.loadKnowledgeBase();

    // Register GLY actions with Central Calls System
    this.callsSystem.registerHandler<InboundChatMessageRequest, GlyChatResponse>(
      'GLY',
      'chat.message',
      async (envelope) => this.handleUserMessage(envelope.payload)
    );

    this.logger.info('GLY initialized as Central Conversational Gateway & registered with calls/');
  }

  /**
   * Ingests local PayPal knowledge markdown files for RAG queries.
   */
  private loadKnowledgeBase(): void {
    const kbDir = path.resolve(process.cwd(), 'docs/knowledge/paypal');
    if (fs.existsSync(kbDir)) {
      const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const fullPath = path.join(kbDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const title = file.replace('.md', '').replace(/_/g, ' ').toUpperCase();
        this.knowledgeDocs.push({
          title,
          category: file.includes('fee') ? 'FEES' : file.includes('dispute') ? 'DISPUTES' : 'BUYER_PROTECTION',
          content
        });
      }
      this.logger.info(`Loaded ${this.knowledgeDocs.length} PayPal documentation assets into memory RAG index`);
    } else {
      this.logger.warn(`PayPal knowledge directory not found at ${kbDir}`);
    }
  }

  /**
   * Main conversational entry point. Ingests all user messages.
   */
  public async handleUserMessage(request: InboundChatMessageRequest): Promise<GlyChatResponse> {
    const { conversationId, userId, content } = request;
    const lowerContent = content.toLowerCase();
    this.logger.info(`Received user message: "${content}"`, undefined, conversationId);

    // 1. Intent Classification
    if (lowerContent.includes('buy') || lowerContent.includes('find') || lowerContent.includes('laptop') || lowerContent.includes('price')) {
      return this.handleShoppingIntent(request);
    }

    if (lowerContent.includes('fee') || lowerContent.includes('buyer protection') || lowerContent.includes('seller protection') || lowerContent.includes('dispute') || lowerContent.includes('hold') || lowerContent.includes('paypal')) {
      return this.handlePayPalGuidanceIntent(request);
    }

    return {
      replyText: "Hello! I am GLY, your personal guide and companion. You can ask me any PayPal-related question or ask me to research and find products across trusted merchants.",
      intent: 'INTENT_GENERAL_DIALOGUE'
    };
  }

  /**
   * Handles PayPal Guidance queries using local grounded RAG.
   */
  public async handlePayPalGuidanceIntent(request: InboundChatMessageRequest): Promise<GlyChatResponse> {
    const query = request.content.toLowerCase();
    const matches: PayPalKnowledgeReference[] = [];

    for (const doc of this.knowledgeDocs) {
      if (
        (query.includes('fee') && doc.category === 'FEES') ||
        (query.includes('protection') && doc.category === 'BUYER_PROTECTION') ||
        (query.includes('dispute') || query.includes('hold') || query.includes('refund')) && doc.category === 'DISPUTES'
      ) {
        matches.push({
          documentId: doc.title,
          title: doc.title,
          url: `docs/knowledge/paypal/${doc.title.toLowerCase().replace(/ /g, '_')}.md`,
          contentSnippet: doc.content.substring(0, 300) + '...',
          score: 0.95,
          section: 'Policy Overview'
        });
      }
    }

    if (matches.length > 0) {
      const topDoc = this.knowledgeDocs.find(d => d.title === matches[0].documentId);
      const answerSnippet = topDoc ? topDoc.content.split('\n\n').slice(0, 3).join('\n\n') : '';
      return {
        replyText: `Here is the authoritative information from PayPal official documentation:\n\n${answerSnippet}`,
        intent: 'INTENT_PAYPAL_GUIDANCE',
        references: matches
      };
    }

    return {
      replyText: "I searched our official PayPal documentation, but couldn't find a direct match. For account-specific security verifications, please visit the official PayPal Help Center.",
      intent: 'INTENT_PAYPAL_GUIDANCE',
      references: []
    };
  }

  /**
   * Handles Shopping & Product Research intent via asynchronous delegation to ARB through calls/.
   */
  public async handleShoppingIntent(request: InboundChatMessageRequest): Promise<GlyChatResponse> {
    const { conversationId, userId, content } = request;
    const taskId = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // Extract budget heuristic (e.g. "under 75,000" or default 75000)
    let budget = 75000;
    const budgetMatch = content.match(/under\s+(?:₹|rs\.?|inr\s*)?([0-9,]+)/i);
    if (budgetMatch && budgetMatch[1]) {
      budget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    }

    // 1. Create asynchronous background task in TaskManager
    this.taskManager.createTask({
      taskId,
      conversationId,
      userId,
      targetPal: 'ARB',
      taskType: 'RESEARCH',
      priority: 'normal',
      payload: { productQuery: content, budgetCeiling: budget, currency: 'INR' },
      userLimits: { maxBudget: budget, currency: 'INR' },
      createdAt: new Date().toISOString()
    });

    // 2. Dispatch call to ARB asynchronously through calls/
    const researchCall: PalCallEnvelope<ARBResearchPayload> = {
      callId: `call_${Date.now().toString(36)}`,
      correlationId: taskId,
      caller: 'GLY',
      callee: 'ARB',
      action: 'research.start',
      payload: {
        productQuery: content,
        budgetCeiling: budget,
        currency: 'INR',
        mandatorySpecifications: {},
        minMerchantTrustScore: 80
      },
      metadata: {
        timestamp: new Date().toISOString(),
        timeoutMs: 30000
      }
    };

    // Execute in background so GLY remains non-blocking
    this.callsSystem.dispatch<ARBResearchPayload, ARBResearchResult>(researchCall).then((response) => {
      if (response.status === 'SUCCESS' && response.data) {
        this.taskManager.updateStatus(taskId, 'COMPLETED', {
          progressPercent: 100,
          statusMessage: 'Research successfully concluded',
          resultPayload: response.data as unknown as Record<string, unknown>
        });
      } else {
        this.taskManager.updateStatus(taskId, 'FAILED', {
          statusMessage: response.error?.message || 'Research failed'
        });
      }
    });

    // 3. Immediately acknowledge delegation to user (non-blocking)
    return {
      replyText: `I've informed ARB about your requirements. It is researching trusted merchants and suitable options under ₹${budget.toLocaleString()}. You can continue chatting with me while it works!`,
      intent: 'INTENT_SHOPPING_RESEARCH',
      delegatedTaskId: taskId
    };
  }

  /**
   * Coordinates payment execution with User Approval Token through calls/ to DEFENDER and PULSE.
   */
  public async executeAuthorizedPayment(
    approvalToken: UserApprovalToken,
    proposal: PurchaseProposal,
    conversationId: string
  ): Promise<GlyChatResponse> {
    const correlationId = `pay_${Date.now().toString(36)}`;

    // 1. Pre-Payment Security Audit via DEFENDER
    const defenderCall: PalCallEnvelope = {
      callId: `call_def_${Date.now().toString(36)}`,
      correlationId,
      caller: 'GLY',
      callee: 'DEFENDER',
      action: 'security.assess_transaction',
      payload: {
        assessmentId: correlationId,
        approvalToken,
        purchaseProposal: proposal,
        clientMetadata: {}
      },
      metadata: { timestamp: new Date().toISOString(), timeoutMs: 10000 }
    };

    const defenderRes = await this.callsSystem.dispatch(defenderCall);
    const auditData = defenderRes.data as { decision: string } | undefined;

    if (auditData?.decision !== 'APPROVED') {
      return {
        replyText: "Transaction was flagged by transaction security auditing and could not proceed.",
        intent: 'INTENT_PAYMENT_BLOCKED'
      };
    }

    // 2. Dispatch Payment to PULSE via calls/
    const pulseCall: PalCallEnvelope<PulsePaymentRequest> = {
      callId: `call_pulse_${Date.now().toString(36)}`,
      correlationId,
      caller: 'GLY',
      callee: 'PULSE',
      action: 'payment.execute',
      payload: {
        paymentRequestId: correlationId,
        approvalToken,
        proposalId: proposal.proposalId,
        merchantDomain: proposal.merchantDomain,
        orderTotal: proposal.pricingBreakdown.totalPayable,
        currency: proposal.pricingBreakdown.currency,
        paymentMethod: 'PAYPAL_ORDER'
      },
      metadata: { timestamp: new Date().toISOString(), timeoutMs: 15000 }
    };

    const pulseRes = await this.callsSystem.dispatch<PulsePaymentRequest, PulsePaymentResponse>(pulseCall);

    if (pulseRes.status === 'SUCCESS' && pulseRes.data?.status === 'COMPLETED') {
      return {
        replyText: `Payment successfully captured via PayPal! Receipt #${pulseRes.data.receiptNumber}. Thank you for using PALS!`,
        intent: 'INTENT_PAYMENT_COMPLETED',
        paymentResult: pulseRes.data
      };
    }

    return {
      replyText: `Payment failed: ${pulseRes.data?.errorMessage || pulseRes.error?.message || 'Payment execution rejected.'}`,
      intent: 'INTENT_PAYMENT_FAILED'
    };
  }
}


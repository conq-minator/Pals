import {
  PurchaseProposal,
  UserApprovalToken,
  TaskLifecycleEvent,
  PulsePaymentResponse
} from '../types/index.js';
import { GlySimulator } from './glySimulator.js';

export interface GlyChatResponse {
  replyText: string;
  intent: string;
  delegatedTaskId?: string;
  purchaseProposal?: PurchaseProposal;
  paymentResult?: PulsePaymentResponse;
  /** PayPal page the buyer must open to approve the payment (sent by PULSE via GLY). */
  paypalApprovalUrl?: string;
  /** Products ARB found, shown as cards with a "Get this ready" button. */
  products?: ProductCardData[];
  references?: Array<{
    documentId: string;
    title: string;
    url: string;
    contentSnippet: string;
    score: number;
    section: string;
  }>;
}

export type ProductCardData = { title: string; merchant: string; price: { value: number; currency: string }; url: string | null; highlights: string[] };

export type MessageHandler = (response: GlyChatResponse) => void;
export type TaskEventHandler = (event: TaskLifecycleEvent) => void;
export type ConnectionMode = 'live_ws' | 'connecting' | 'offline' | 'simulated';
export type ConnectionChangeHandler = (connected: boolean, mode: ConnectionMode) => void;
export type PalHealth = Record<'GLY' | 'ARB' | 'DEFENDER' | 'PULSE', boolean>;

// ---- What the PALS server (shared/orchestrator/server.ts -> GLY/GLY/chat/socket.ts) speaks ----
type Money = { value: number; currency: string };
type ServerCard =
  | { kind: 'product_results'; taskId: string; title: string; products: { title: string; merchant: string; price: Money; url: string | null; highlights: string[] }[] }
  | { kind: 'approval'; proposalId: string; title: string; merchant: string; listPrice: Money; finalPrice: Money; couponApplied: string | null; expiresAt: string }
  | { kind: 'payment_receipt'; receiptId: string; amount: Money; merchant: string; status: 'captured' | 'declined' }
  | { kind: 'transactions'; summary: string; rows: { date: string; description: string; amount: Money }[] }
  | { kind: 'action_link'; title: string; label: string; url: string }
  | { kind: 'error'; title: string; detail: string };
type ServerEvent =
  | { type: 'message'; text: string }
  | { type: 'token'; streamId: string; text: string }
  | { type: 'stream_end'; streamId: string; sources: { n: number; title: string; url: string }[] }
  | { type: 'card'; card: ServerCard }
  | { type: 'status'; text: string }
  | { type: 'error'; text: string };

const SIMULATE = import.meta.env.VITE_PALS_SIMULATE === 'true';
export const money = (m: Money) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: m.currency }).format(m.value);
  } catch {
    return `${m.currency} ${m.value.toFixed(2)}`;
  }
};
const domainOf = (merchant: string) => merchant.match(/\(via ([^)]+)\)/)?.[1] ?? merchant.toLowerCase();

/**
 * GLY Client: the browser's only connection to PALS.
 *
 * Talks to the PALS server's WebSocket at /chat (GLY), which routes to ARB, DEFENDER and PULSE.
 * The frontend never calls ARB, DEFENDER, PULSE or PayPal itself, and never holds PayPal secrets.
 * Set VITE_PALS_SIMULATE=true only for offline UI work: every reply is then made up.
 */
export class GlyClient {
  private wsUrl: string;
  private healthUrl: string;
  private ws: WebSocket | null = null;
  private messageListeners: Set<MessageHandler> = new Set();
  private taskListeners: Set<TaskEventHandler> = new Set();
  private connectionListeners: Set<ConnectionChangeHandler> = new Set();
  private healthListeners: Set<(h: PalHealth | null) => void> = new Set();
  private connectionMode: ConnectionMode = 'connecting';
  private streams = new Map<string, string>();
  private outbox: string[] = [];
  private retryMs = 1000;
  private simulator: GlySimulator | null = null;
  private health: PalHealth | null = null;

  private conversationId: string;
  private userId: string;

  constructor() {
    // Same origin by default: the PALS server serves the built app, and Vite's dev server proxies
    // /chat and /healthz to it. VITE_GLY_BASE_URL points somewhere else (e.g. http://localhost:8787).
    const base = (import.meta.env.VITE_GLY_BASE_URL || window.location.origin).replace(/\/$/, '');
    this.conversationId = this.loadId('pals_session', 'sess');
    this.userId = this.loadId('pals_user', 'usr');
    const wsBase = import.meta.env.VITE_GLY_WS_URL || base.replace(/^http/, 'ws') + '/chat';
    this.wsUrl = `${wsBase}?sessionId=${encodeURIComponent(this.conversationId)}&userId=${encodeURIComponent(this.userId)}`;
    this.healthUrl = `${base}/healthz`;

    if (SIMULATE) {
      this.simulator = new GlySimulator({
        conversationId: this.conversationId,
        emitMessage: (r) => this.emitMessage(r),
        emitTask: (e) => this.emitTask(e)
      });
      this.connectionMode = 'simulated';
    } else {
      this.connect();
      void this.refreshHealth();
      setInterval(() => void this.refreshHealth(), 15_000);
    }
  }

  /** Keeps the same session across reloads, so PayPal's return lands in the same chat. */
  private loadId(key: string, prefix: string): string {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return saved;
    } catch { /* storage blocked */ }
    const id = `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    try { localStorage.setItem(key, id); } catch { /* storage blocked */ }
    return id;
  }

  public getConversationId(): string { return this.conversationId; }
  public getUserId(): string { return this.userId; }
  public setUserId(newUserId: string): void { this.userId = newUserId; }
  public getConnectionMode(): ConnectionMode { return this.connectionMode; }
  public isSimulated(): boolean { return SIMULATE; }
  public getHealth(): PalHealth | null { return this.health; }

  public onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public onTaskEvent(handler: TaskEventHandler): () => void {
    this.taskListeners.add(handler);
    return () => this.taskListeners.delete(handler);
  }

  public onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionListeners.add(handler);
    handler(this.connectionMode === 'live_ws' || this.connectionMode === 'simulated', this.connectionMode);
    return () => this.connectionListeners.delete(handler);
  }

  public onHealth(handler: (h: PalHealth | null) => void): () => void {
    this.healthListeners.add(handler);
    handler(this.health);
    return () => this.healthListeners.delete(handler);
  }

  private emitMessage(r: GlyChatResponse) {
    for (const l of this.messageListeners) l(r);
  }

  private emitTask(e: TaskLifecycleEvent) {
    for (const l of this.taskListeners) l(e);
  }

  private setMode(mode: ConnectionMode) {
    this.connectionMode = mode;
    for (const l of this.connectionListeners) l(mode === 'live_ws', mode);
  }

  private async refreshHealth() {
    try {
      const res = await fetch(this.healthUrl, { signal: AbortSignal.timeout(3000) });
      const body = await res.json();
      this.health = body?.pals ?? null;
    } catch {
      this.health = null;
    }
    for (const l of this.healthListeners) l(this.health);
  }

  // ---------------------------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------------------------

  private connect(): void {
    this.setMode('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retryMs = 1000;
      this.setMode('live_ws');
      for (const frame of this.outbox.splice(0)) ws.send(frame);
    };
    ws.onmessage = (event) => {
      try {
        this.handleServerEvent(JSON.parse(event.data) as ServerEvent);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    this.setMode('offline');
    setTimeout(() => this.connect(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, 15_000);
  }

  private send(frame: object) {
    const raw = JSON.stringify(frame);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(raw);
    else this.outbox.push(raw);
  }

  private taskEvent(status: TaskLifecycleEvent['status'], statusMessage: string, targetPal: TaskLifecycleEvent['targetPal'] = 'GLY'): TaskLifecycleEvent {
    return {
      eventId: `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      taskId: 'live',
      conversationId: this.conversationId,
      targetPal,
      status,
      statusMessage,
      emittedAt: new Date().toISOString()
    };
  }

  /** Turns what GLY sends into what the UI components already understand. */
  private handleServerEvent(e: ServerEvent) {
    switch (e.type) {
      case 'message':
        this.emitMessage({ replyText: e.text, intent: 'chat' });
        return;
      case 'error':
        this.emitMessage({ replyText: e.text, intent: 'INTENT_ERROR' });
        return;
      case 'status':
        this.emitTask(this.taskEvent('RESEARCHING', e.text));
        return;
      case 'token':
        this.streams.set(e.streamId, (this.streams.get(e.streamId) ?? '') + e.text);
        return;
      case 'stream_end': {
        const text = this.streams.get(e.streamId) ?? '';
        this.streams.delete(e.streamId);
        this.emitMessage({
          replyText: text,
          intent: 'INTENT_PAYPAL_GUIDANCE',
          references: e.sources.map((s) => ({
            documentId: `src_${s.n}`, title: s.title, url: s.url, contentSnippet: '', score: 1, section: `[${s.n}]`
          }))
        });
        return;
      }
      case 'card':
        this.handleCard(e.card);
        return;
    }
  }

  private handleCard(card: ServerCard) {
    switch (card.kind) {
      case 'product_results': {
        this.emitTask(this.taskEvent('COMPLETED', `Found ${card.products.length} options`, 'ARB'));
        this.emitMessage({
          replyText: card.products.length
            ? `Here's what I found for **${card.title}**. Pick one and I'll prepare an offer.`
            : `I couldn't find anything for ${card.title}.`,
          intent: 'INTENT_SHOPPING_RESEARCH',
          products: card.products
        });
        return;
      }
      case 'approval': {
        // GLY's approval card carries list price, final (landed) price and coupon; ARB's full
        // breakdown stays server-side, so the difference is shown as the discount.
        const list = card.listPrice.value;
        const final = card.finalPrice.value;
        const proposal: PurchaseProposal = {
          proposalId: card.proposalId,
          taskId: card.proposalId,
          merchantName: card.merchant,
          merchantDomain: domainOf(card.merchant),
          checkoutUrl: `https://${domainOf(card.merchant)}`,
          productTitle: card.title,
          sku: card.proposalId,
          pricingBreakdown: {
            basePrice: list,
            discountApplied: Math.max(0, Math.round((list - final) * 100) / 100),
            shippingFee: 0,
            taxes: 0,
            totalPayable: final,
            currency: card.finalPrice.currency
          },
          negotiationLog: {
            attempted: !!card.couponApplied,
            successful: !!card.couponApplied,
            savingsAmount: Math.max(0, Math.round((list - final) * 100) / 100),
            description: card.couponApplied ? `Coupon ${card.couponApplied} applied.` : 'No coupon available.'
          },
          merchantTrustScore: 0,
          expiresAt: card.expiresAt
        } as PurchaseProposal;
        this.emitMessage({
          replyText: `Your offer is ready: **${card.title}** from ${card.merchant} for **${money(card.finalPrice)}**. Check it in the offer panel and press Approve when you're happy.`,
          intent: 'INTENT_PURCHASE_CONFIRMATION',
          purchaseProposal: proposal
        });
        return;
      }
      case 'action_link':
        this.emitMessage({
          replyText: `The security check passed. Press **Pay with PayPal** in the offer panel to finish on PayPal's site.`,
          intent: 'INTENT_PAYPAL_APPROVAL_REQUIRED',
          paypalApprovalUrl: card.url
        });
        return;
      case 'payment_receipt': {
        const captured = card.status === 'captured';
        const paymentResult: PulsePaymentResponse = {
          paymentRequestId: card.receiptId,
          paypalOrderId: card.receiptId,
          status: captured ? 'COMPLETED' : 'FAILED',
          finalAmountCaptured: captured ? card.amount.value : 0,
          currency: card.amount.currency,
          receiptNumber: card.receiptId,
          transactionTimestamp: new Date().toISOString()
        };
        this.emitTask(this.taskEvent(captured ? 'COMPLETED' : 'FAILED', captured ? `Paid ${money(card.amount)}` : 'Payment declined', 'PULSE'));
        this.emitMessage({
          replyText: captured
            ? `Payment complete: ${money(card.amount)} to ${card.merchant}. Receipt ${card.receiptId}.`
            : `Payment to ${card.merchant} was declined. Nothing was charged.`,
          intent: captured ? 'INTENT_PAYMENT_COMPLETED' : 'INTENT_PAYMENT_FAILED',
          paymentResult
        });
        return;
      }
      case 'transactions': {
        const rows = card.rows.map((r) => `- ${r.date.slice(0, 10)} · ${r.description} · **${money(r.amount)}**`);
        this.emitMessage({ replyText: `${card.summary}${rows.length ? `\n\n${rows.join('\n')}` : ''}`, intent: 'INTENT_TRANSACTIONS' });
        return;
      }
      case 'error':
        this.emitMessage({ replyText: `${card.title}: ${card.detail}`, intent: 'INTENT_PAYMENT_FAILED' });
        return;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the approval record the card displays. It is NOT a security token and is never sent:
   * the server issues its own approval token when GLY forwards the approval to DEFENDER and PULSE.
   */
  public async generateUserApprovalToken(proposal: PurchaseProposal, userId = this.userId): Promise<UserApprovalToken> {
    const issuedAt = new Date().toISOString();
    const expiresAt = proposal.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const tokenIdentifier = `apprv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode([tokenIdentifier, proposal.proposalId, userId, proposal.pricingBreakdown.totalPayable.toFixed(2), proposal.pricingBreakdown.currency].join(':'))
    );
    const userSignature = 'ref_' + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return {
      approvalToken: tokenIdentifier,
      proposalId: proposal.proposalId,
      userId,
      authorizedMaxAmount: proposal.pricingBreakdown.totalPayable,
      authorizedCurrency: proposal.pricingBreakdown.currency,
      authorizedMerchantDomain: proposal.merchantDomain,
      userSignature,
      issuedAt,
      expiresAt
    };
  }

  /** Sends a chat message to GLY. Replies arrive through onMessage. */
  public async sendChatMessage(content: string): Promise<void> {
    if (this.simulator) {
      await this.simulator.simulateGlyResponse({
        conversationId: this.conversationId,
        userId: this.userId,
        messageId: `msg_${Date.now().toString(36)}`,
        content,
        timestamp: new Date().toISOString(),
        clientContext: { deviceType: 'desktop', timezone: 'UTC', locale: navigator.language || 'en-US' }
      });
      return;
    }
    if (this.connectionMode !== 'live_ws') {
      this.emitMessage({ replyText: "I can't reach the PALS server right now. Your message will be sent as soon as it reconnects.", intent: 'INTENT_ERROR' });
    }
    this.send({ type: 'user_message', text: content });
  }

  /**
   * Approves (or rejects) an offer. GLY forwards it to DEFENDER, then PULSE creates the PayPal
   * order; the "open PayPal" link and later the receipt arrive through onMessage.
   */
  public async submitApproval(approvalToken: UserApprovalToken, proposal: PurchaseProposal, decision: 'approve' | 'reject' = 'approve'): Promise<GlyChatResponse> {
    if (this.simulator) return this.simulator.simulateApprovalExecution(approvalToken, proposal);
    this.send({ type: 'approval', proposalId: proposal.proposalId, decision });
    return { replyText: 'Approval sent. DEFENDER is checking it before PayPal.', intent: 'INTENT_APPROVAL_SENT' };
  }
}

// Singleton GLY client instance
export const glyClient = new GlyClient();

/** Ask something through the chat panel, so the question shows in the chat like a typed one. */
export function askInChat(text: string): void {
  window.dispatchEvent(new CustomEvent('pals:ask', { detail: text }));
}

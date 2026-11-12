/**
 * PALS Orchestrator: the real `calls/` gateway behind GLY.
 *
 * GLY talks to one interface, `CallsGateway.send(envelope)`, and listens for results on its
 * task bus. Until now that interface was backed by FakeCalls (made-up products and receipts).
 * This class backs it with the real PALs instead. Every hop goes through the Central Calls
 * System (`calls/`), so no PAL ever touches another PAL's internals:
 *
 *   research.start      GLY -> ARB  extract.requirements, research.start
 *   purchase_prep.start GLY -> ARB  purchase_prep.start            -> proposal.ready
 *   payment.execute     ORCHESTRATOR -> DEFENDER security.assess_transaction
 *                       ORCHESTRATOR -> PULSE    payment.create_order -> buyer approves on PayPal
 *                       ORCHESTRATOR -> PULSE    payment.capture      -> receipt
 *   transaction.query   GLY -> PULSE transaction.list
 *
 * `send()` returns as soon as the job is accepted. The work runs in the background and its
 * outcome is published on GLY's task bus, exactly like FakeCalls did.
 */

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { CentralCallsSystem } from '../../calls/index.js';
import { PalsLogger } from '../logging/index.js';
import type {
  ARBResearchPayloadInput,
  ARBResearchResult,
  DefenderAssessmentRequest,
  DefenderAssessmentResponse,
  MerchantListing,
  PALIdentifier,
  PulsePaymentRequest,
  PulsePaymentResponse,
  PurchaseProposal,
  UserApprovalToken
} from '../types/index.js';
import type { CallsGateway } from '../../GLY/calls/index.ts';
import type { TaskBus } from '../../GLY/shared/tasks/index.ts';
import type {
  ARBResearchPayload as GlyResearchRequest,
  CallAck,
  Money,
  PalCallEnvelope as GlyEnvelope,
  ProductResult,
  PulsePaymentRequest as GlyPaymentRequest,
  PurchasePrepRequest,
  PurchaseProposal as GlyProposal,
  TaskEvent,
  TransactionQueryRequest
} from '../../GLY/shared/types/index.ts';

/** Currencies PayPal can charge. INR is not one of them. */
export const PAYPAL_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN',
  'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD'
]);

/** Sent to ARB when the user gave no budget. ARB still needs a positive ceiling. */
const NO_BUDGET_CEILING = 1_000_000_000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const sameMoney = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

export interface OrchestratorOptions {
  /** Currency used when the user names none. Default USD. */
  defaultCurrency?: string;
  /** Currency offers are quoted in when the research currency can't be charged by PayPal. Default USD. */
  settlementCurrency?: string;
  /** Key for signing approval tokens. Random per process when omitted. */
  approvalSecret?: string;
  /** Most products shown on a results card. Default 5. */
  maxProducts?: number;
  timeouts?: { researchMs?: number; defenderMs?: number; pulseMs?: number };
}

interface ExtractedRequirements extends ARBResearchPayloadInput {
  targetMerchants?: string[];
}

interface ResearchRecord {
  taskId: string;
  userId: string;
  request: ARBResearchPayloadInput;
  listings: MerchantListing[];
}

interface ProposalRecord {
  proposal: PurchaseProposal;
  userId: string;
  taskId: string;
}

interface PendingPayment {
  taskId: string;
  paypalOrderId: string;
  amount: Money;
  merchant: string;
  settled: boolean;
}

/** Shape of PULSE's ledger rows as returned by `transaction.list`. */
interface LedgerRow {
  transactionId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  proposalId: string;
  amount: number;
  currency: string;
  merchantDomain: string;
  status: string;
  createdAt: string;
  capturedAt?: string;
}

export type PaymentCompletion =
  | { ok: true; receiptId: string; amount: Money; merchant: string }
  | { ok: false; reason: string; retryable: boolean };

export class PalsOrchestrator implements CallsGateway {
  private logger = new PalsLogger('ORCHESTRATOR');
  private calls: CentralCallsSystem;
  private bus: TaskBus;
  private opts: Required<Pick<OrchestratorOptions, 'defaultCurrency' | 'settlementCurrency' | 'maxProducts'>>;
  private timeouts: { researchMs: number; defenderMs: number; pulseMs: number };
  private secret: string;

  private seenKeys = new Map<string, string>(); // idempotencyKey -> taskId
  private activeTasks = new Set<string>();
  private research = new Map<string, ResearchRecord>(); // GLY research taskId -> what ARB found
  private proposals = new Map<string, ProposalRecord>(); // proposalId -> ARB's full proposal
  private payments = new Map<string, PendingPayment>(); // paypalOrderId -> payment in flight

  constructor(deps: { bus: TaskBus; calls?: CentralCallsSystem } & OrchestratorOptions) {
    this.bus = deps.bus;
    this.calls = deps.calls ?? CentralCallsSystem.getInstance();
    this.opts = {
      defaultCurrency: (deps.defaultCurrency ?? 'USD').toUpperCase(),
      settlementCurrency: (deps.settlementCurrency ?? 'USD').toUpperCase(),
      maxProducts: deps.maxProducts ?? 5
    };
    this.timeouts = {
      researchMs: deps.timeouts?.researchMs ?? 60_000,
      defenderMs: deps.timeouts?.defenderMs ?? 20_000,
      pulseMs: deps.timeouts?.pulseMs ?? 30_000
    };
    this.secret = deps.approvalSecret ?? randomBytes(32).toString('hex');
    if (!PAYPAL_CURRENCIES.has(this.opts.settlementCurrency)) {
      throw new Error(`Settlement currency ${this.opts.settlementCurrency} cannot be charged by PayPal`);
    }

    // ARB reports back through calls/. Progress keeps GLY's task fresh; the final results
    // already arrive as the response to our own dispatch, so those are only acknowledged.
    this.calls.registerHandler<{ taskId?: string; statusMessage?: string }, { ok: true }>(
      'GLY', 'task.progress', async (env) => {
        const taskId = env.payload.taskId ?? env.correlationId;
        if (this.activeTasks.has(taskId)) {
          this.emit(taskId, 'task.progress', { note: env.payload.statusMessage ?? 'Working on it' });
        }
        return { ok: true };
      }
    );
    for (const [callee, action] of [
      ['GLY', 'research.completed'],
      ['GLY', 'research.needs_input'],
      ['ORCHESTRATOR', 'proposal.ready']
    ] as Array<[PALIdentifier, string]>) {
      this.calls.registerHandler(callee, action, async () => ({ ok: true }));
    }
    this.logger.info('Orchestrator online: GLY is wired to ARB, DEFENDER and PULSE through calls/');
  }

  // ---------------------------------------------------------------------------------------------
  // CallsGateway (what GLY calls)
  // ---------------------------------------------------------------------------------------------

  async send(env: GlyEnvelope): Promise<CallAck> {
    const earlier = this.seenKeys.get(env.idempotencyKey);
    if (earlier) return { accepted: true, taskId: earlier }; // same key never starts the work twice
    this.seenKeys.set(env.idempotencyKey, env.taskId);
    this.activeTasks.add(env.taskId);

    // Fire and forget: GLY must get its ack now, not when the work is done.
    void this.run(env)
      .catch((err) => {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`Task ${env.action} failed: ${reason}`, undefined, env.taskId);
        this.fail(env.taskId, reason);
      });
    return { accepted: true, taskId: env.taskId };
  }

  private async run(env: GlyEnvelope): Promise<void> {
    switch (env.action) {
      case 'research.start':
        return this.runResearch(env.taskId, env.payload as GlyResearchRequest);
      case 'purchase_prep.start':
        return this.runPurchasePrep(env.taskId, env.payload as PurchasePrepRequest);
      case 'payment.execute':
        return this.runPayment(env.taskId, env.payload as GlyPaymentRequest);
      case 'transaction.query':
        return this.runTransactionQuery(env.taskId, env.payload as TransactionQueryRequest);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // research.start -> ARB
  // ---------------------------------------------------------------------------------------------

  private async runResearch(taskId: string, p: GlyResearchRequest): Promise<void> {
    const request = await this.buildResearchRequest(taskId, p.userId, p.query, p.maxPrice, p.notes);
    const result = await this.researchWithArb(taskId, request);
    this.research.set(taskId, { taskId, userId: p.userId, request, listings: result.topRecommendations });

    this.emit(taskId, 'task.completed', {
      kind: 'research',
      products: result.topRecommendations.slice(0, this.opts.maxProducts).map((l) => this.toProduct(l))
    });
  }

  /** GLY's short request -> ARB's full research payload. ARB itself reads the specs out of the user's words. */
  private async buildResearchRequest(
    taskId: string,
    userId: string,
    query: string,
    maxPrice: Money | null,
    notes: string | null
  ): Promise<ARBResearchPayloadInput & { userId: string }> {
    const extracted = await this.call<ExtractedRequirements>(
      'GLY', 'ARB', 'extract.requirements', { prompt: notes?.trim() || query }, taskId, 10_000
    );

    // Budget: what GLY understood wins, then what ARB read from the text, else no cap.
    let budgetCeiling = NO_BUDGET_CEILING;
    let currency = this.opts.defaultCurrency;
    let noBudgetStated = true;
    if (maxPrice && maxPrice.value > 0) {
      budgetCeiling = maxPrice.value;
      currency = maxPrice.currency.toUpperCase();
      noBudgetStated = false;
    } else if (extracted.noBudgetStated === false && extracted.budgetCeiling > 0) {
      budgetCeiling = extracted.budgetCeiling;
      currency = (extracted.currency ?? currency).toUpperCase();
      noBudgetStated = false;
    }

    const specs = { ...(extracted.mandatorySpecifications ?? {}) };
    if (extracted.targetMerchants?.length) specs['target_merchants'] = extracted.targetMerchants.join(',');

    return {
      userId,
      productQuery: query,
      category: extracted.category,
      quantity: extracted.quantity,
      budgetCeiling,
      currency,
      noBudgetStated,
      budgetFlexibility: extracted.budgetFlexibility,
      mandatorySpecifications: specs,
      softPreferences: extracted.softPreferences,
      preferredBrands: extracted.preferredBrands?.length ? extracted.preferredBrands : undefined,
      excludedBrands: extracted.excludedBrands?.length ? extracted.excludedBrands : undefined,
      deliveryPostalCode: extracted.deliveryPostalCode,
      deliveryBy: extracted.deliveryBy,
      minMerchantTrustScore: extracted.minMerchantTrustScore,
      // GLY has no screen for ARB's follow-up questions yet, so ARB takes its best guess.
      allowAmbiguousGuess: true
    };
  }

  private async researchWithArb(correlationId: string, request: ARBResearchPayloadInput): Promise<ARBResearchResult> {
    const result = await this.call<ARBResearchResult>(
      'GLY', 'ARB', 'research.start', request, correlationId, this.timeouts.researchMs
    );
    if (result.needsInput) {
      const options = result.inputOptions?.length ? ` (${result.inputOptions.join(' / ')})` : '';
      throw new Error(`I need a bit more detail to search. ${result.inputQuestion ?? 'What exactly are you looking for?'}${options}`);
    }
    return result;
  }

  private toProduct(l: MerchantListing): ProductResult {
    return {
      title: l.productTitle,
      merchant: l.merchantName,
      // The price shown is the landed cost: item + shipping + tax, i.e. what checkout will ask for.
      price: { value: round2(l.totalLandedCost), currency: l.currency },
      url: l.productUrl || null,
      highlights: [...l.pros.slice(0, 2), `trust ${l.trustScore}/100`]
    };
  }

  // ---------------------------------------------------------------------------------------------
  // purchase_prep.start -> ARB
  // ---------------------------------------------------------------------------------------------

  private async runPurchasePrep(taskId: string, p: PurchasePrepRequest): Promise<void> {
    // 1. The research the user is talking about; run one now if there isn't any.
    let record = p.basedOnTaskId ? this.research.get(p.basedOnTaskId) : undefined;
    if (record && record.userId !== p.userId) record = undefined; // never reuse another user's research
    if (!record) {
      const request = await this.buildResearchRequest(taskId, p.userId, p.query, p.maxPrice, null);
      const result = await this.researchWithArb(taskId, request);
      record = { taskId, userId: p.userId, request, listings: result.topRecommendations };
      this.research.set(taskId, record);
    }
    if (!record.listings.length) throw new Error(`I couldn't find an offer for ${p.query}.`);

    // 2. Pick the listing the user means.
    let listing = pickListing(record.listings, p.query);
    let researchTaskId = record.taskId;

    // 3. PayPal can't charge every currency (INR, for one). Re-quote the same item in one it can.
    if (!PAYPAL_CURRENCIES.has(listing.currency.toUpperCase())) {
      const from = listing.currency.toUpperCase();
      const settleId = `${taskId}:settle`;
      const requote = await this.researchWithArb(settleId, {
        ...record.request,
        currency: this.opts.settlementCurrency,
        budgetCeiling: NO_BUDGET_CEILING,
        noBudgetStated: true
      });
      const same = requote.topRecommendations.find((l) => l.sku === listing.sku && l.merchantDomain === listing.merchantDomain);
      if (!same) {
        throw new Error(`PayPal can't charge ${from}, and I couldn't re-quote this offer in ${this.opts.settlementCurrency}.`);
      }
      listing = same;
      researchTaskId = settleId;
      this.emit(taskId, 'task.progress', {
        note: `PayPal can't charge ${from}, so this offer is quoted in ${this.opts.settlementCurrency}.`,
        show: true
      });
    }

    // 4. ARB builds the proposal. It re-checks price, stock and merchant against its own research.
    const proposal = await this.call<PurchaseProposal>(
      'GLY', 'ARB', 'purchase_prep.start', { listing, taskId: researchTaskId }, taskId, this.timeouts.researchMs
    );
    const total = round2(proposal.pricingBreakdown.totalPayable);
    const currency = proposal.pricingBreakdown.currency.toUpperCase();
    if (p.maxPrice && p.maxPrice.currency.toUpperCase() === currency && total > p.maxPrice.value) {
      throw new Error(`The best offer (${currency} ${total}) is over your ${currency} ${p.maxPrice.value} limit.`);
    }

    this.proposals.set(proposal.proposalId, { proposal, userId: p.userId, taskId });
    const b = proposal.pricingBreakdown;
    const card: GlyProposal = {
      proposalId: proposal.proposalId,
      userId: p.userId,
      item: { title: proposal.productTitle, merchant: proposal.merchantName, url: proposal.checkoutUrl || null },
      listPrice: { value: round2(b.basePrice + b.shippingFee + b.taxes), currency },
      finalPrice: { value: total, currency },
      couponApplied: proposal.negotiationLog?.successful ? proposal.negotiationLog.description : null,
      expiresAt: proposal.expiresAt
    };
    this.emit(taskId, 'proposal.ready', card);
  }

  // ---------------------------------------------------------------------------------------------
  // payment.execute -> DEFENDER -> PULSE
  // ---------------------------------------------------------------------------------------------

  private async runPayment(taskId: string, p: GlyPaymentRequest): Promise<void> {
    const record = this.proposals.get(p.proposalId);
    if (!record) throw new Error('That offer is no longer available. Nothing was charged.');
    if (record.userId !== p.userId) throw new Error("That offer isn't on your account. Nothing was charged.");

    const { proposal } = record;
    const total = round2(proposal.pricingBreakdown.totalPayable);
    const currency = proposal.pricingBreakdown.currency.toUpperCase();

    // The amount the user tapped Approve on must be the amount ARB proposed. Checked in code, to the cent.
    if (p.amount.currency.toUpperCase() !== currency || !sameMoney(p.amount.value, total)) {
      throw new Error(
        `The approved amount (${p.amount.currency} ${p.amount.value}) doesn't match the offer (${currency} ${total}). Nothing was charged.`
      );
    }

    // What the user authorised: this merchant, this currency, at most this amount, until the offer expires.
    const approvalToken = this.signApproval({
      proposalId: proposal.proposalId,
      userId: p.userId,
      authorizedMaxAmount: total,
      authorizedCurrency: currency,
      authorizedMerchantDomain: proposal.merchantDomain,
      expiresAt: proposal.expiresAt
    });

    // 1. DEFENDER looks at it first. Anything other than a clean APPROVED stops here (fail closed).
    const assessment: DefenderAssessmentRequest = {
      assessmentId: taskId,
      approvalToken,
      purchaseProposal: proposal,
      clientMetadata: {}
    };
    let verdict: DefenderAssessmentResponse;
    try {
      verdict = await this.call<DefenderAssessmentResponse>(
        'ORCHESTRATOR', 'DEFENDER', 'security.assess_transaction', assessment, taskId, this.timeouts.defenderMs
      );
    } catch (err) {
      throw new Error(`The security check could not run, so the payment was stopped. Nothing was charged. (${(err as Error).message})`);
    }
    if (verdict.decision !== 'APPROVED') {
      const why = verdict.flaggedThreats.map((t) => `${t.type}: ${t.details}`).join('; ') || 'no details given';
      const what = verdict.decision === 'REJECTED' ? 'blocked this payment' : 'held this payment for manual review';
      this.logger.warn(`DEFENDER ${verdict.decision} (risk ${verdict.riskScore})`, { why }, taskId);
      throw new Error(`The security check ${what}. Nothing was charged. Reason: ${why}`);
    }

    // 2. PULSE creates the PayPal order. Its own policy engine re-checks the token.
    const request: PulsePaymentRequest = {
      paymentRequestId: taskId,
      approvalToken,
      proposalId: proposal.proposalId,
      merchantDomain: proposal.merchantDomain,
      orderTotal: total,
      currency,
      paymentMethod: 'PAYPAL_ORDER'
    };
    let order: PulsePaymentResponse & { approveUrl?: string };
    try {
      order = await this.call<PulsePaymentResponse & { approveUrl?: string }>(
        'ORCHESTRATOR', 'PULSE', 'payment.create_order', request, taskId, this.timeouts.pulseMs
      );
    } catch (err) {
      throw new Error(`The payment service is not available. Nothing was charged. (${(err as Error).message})`);
    }
    if (order.status !== 'CREATED' || !order.approveUrl) {
      throw new Error(`PayPal did not accept the order. Nothing was charged. ${order.errorMessage ?? ''}`.trim());
    }

    // 3. The buyer approves on PayPal. The capture happens when PayPal sends them back (completePayment).
    this.payments.set(order.paypalOrderId, {
      taskId,
      paypalOrderId: order.paypalOrderId,
      amount: { value: total, currency },
      merchant: proposal.merchantName,
      settled: false
    });
    this.emit(taskId, 'task.progress', {
      note: `Security check passed. Finish paying ${currency} ${total.toFixed(2)} on PayPal:`,
      link: { label: 'Pay with PayPal', url: order.approveUrl }
    });
  }

  private signApproval(fields: Omit<UserApprovalToken, 'approvalToken' | 'userSignature' | 'issuedAt'>): UserApprovalToken {
    const approvalToken = `apr_${randomUUID()}`;
    const issuedAt = new Date().toISOString();
    const body = [
      approvalToken, fields.proposalId, fields.userId, fields.authorizedMaxAmount.toFixed(2),
      fields.authorizedCurrency, fields.authorizedMerchantDomain, issuedAt, fields.expiresAt
    ].join('|');
    return { approvalToken, ...fields, issuedAt, userSignature: createHmac('sha256', this.secret).update(body).digest('hex') };
  }

  /** Call when PayPal sends the buyer back (`/paypal/return?token=<orderId>`). Captures and posts the receipt. */
  async completePayment(paypalOrderId: string): Promise<PaymentCompletion> {
    const pending = this.payments.get(paypalOrderId);
    if (!pending) return { ok: false, reason: 'Unknown PayPal order.', retryable: false };
    if (pending.settled) return { ok: false, reason: 'This payment was already finished.', retryable: false };
    pending.settled = true; // claimed before awaiting, so a double return can't capture twice

    let res: PulsePaymentResponse;
    try {
      res = await this.call<PulsePaymentResponse>(
        'ORCHESTRATOR', 'PULSE', 'payment.capture', { paypalOrderId }, pending.taskId, this.timeouts.pulseMs
      );
    } catch (err) {
      pending.settled = false;
      return { ok: false, reason: (err as Error).message, retryable: true };
    }

    if (res.status === 'COMPLETED') {
      const amount = { value: res.finalAmountCaptured, currency: res.currency };
      this.emit(pending.taskId, 'task.completed', {
        kind: 'payment', receiptId: res.receiptNumber, amount, merchant: pending.merchant, status: 'captured'
      });
      return { ok: true, receiptId: res.receiptNumber, amount, merchant: pending.merchant };
    }
    if (/not approved by buyer yet/i.test(res.errorMessage ?? '')) {
      pending.settled = false; // they can still approve and come back
      return { ok: false, reason: 'PayPal says this order has not been approved yet.', retryable: true };
    }
    this.fail(pending.taskId, `The payment did not go through. Nothing was charged. ${res.errorMessage ?? ''}`.trim());
    return { ok: false, reason: res.errorMessage ?? 'Capture failed.', retryable: false };
  }

  /** Call when the buyer backs out on PayPal (`/paypal/cancel?token=<orderId>`). */
  cancelPayment(paypalOrderId: string): boolean {
    const pending = this.payments.get(paypalOrderId);
    if (!pending || pending.settled) return false;
    pending.settled = true;
    this.emit(pending.taskId, 'task.completed', {
      kind: 'payment', receiptId: paypalOrderId, amount: pending.amount, merchant: pending.merchant, status: 'declined'
    });
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // transaction.query -> PULSE
  // ---------------------------------------------------------------------------------------------

  private async runTransactionQuery(taskId: string, p: TransactionQueryRequest): Promise<void> {
    if (p.kind === 'balance') {
      throw new Error("I can't read your PayPal balance yet. I can show payments made through PALS.");
    }
    let rows: LedgerRow[];
    try {
      rows = await this.call<LedgerRow[]>('GLY', 'PULSE', 'transaction.list', { userId: p.userId }, taskId, this.timeouts.pulseMs);
    } catch (err) {
      throw new Error(`The payment service is not available right now. (${(err as Error).message})`);
    }

    const day = (iso: string) => iso.slice(0, 10);
    if (p.orderId) rows = rows.filter((r) => [r.paypalOrderId, r.paypalCaptureId, r.transactionId, r.proposalId].includes(p.orderId!));
    if (p.dateFrom) rows = rows.filter((r) => day(r.capturedAt ?? r.createdAt) >= p.dateFrom!);
    if (p.dateTo) rows = rows.filter((r) => day(r.capturedAt ?? r.createdAt) <= p.dateTo!);
    if (p.kind === 'refund_status') rows = rows.filter((r) => r.status === 'REFUNDED' || !!p.orderId);
    rows.sort((a, b) => (b.capturedAt ?? b.createdAt).localeCompare(a.capturedAt ?? a.createdAt));

    const label: Record<string, string> = {
      CREATED: 'awaiting PayPal approval', COMPLETED: 'paid', REFUNDED: 'refunded', FAILED: 'failed'
    };
    const what = p.kind === 'refund_status' ? 'refund' : p.kind === 'order_status' ? 'order' : 'payment';
    this.emit(taskId, 'task.completed', {
      kind: 'transactions',
      summary: rows.length
        ? `${rows.length} ${what}${rows.length === 1 ? '' : 's'} made through PALS`
        : `No ${what}s made through PALS${p.orderId ? ` match ${p.orderId}` : ' yet'}.`,
      rows: rows.map((r) => ({
        date: day(r.capturedAt ?? r.createdAt),
        description: `${r.merchantDomain} (${label[r.status] ?? r.status.toLowerCase()})`,
        amount: { value: r.amount, currency: r.currency }
      }))
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Plumbing
  // ---------------------------------------------------------------------------------------------

  /** One call through the Central Calls System. Throws unless the callee answered SUCCESS. */
  private async call<R>(
    caller: PALIdentifier,
    callee: PALIdentifier,
    action: string,
    payload: unknown,
    correlationId: string,
    timeoutMs: number
  ): Promise<R> {
    const res = await this.calls.dispatch<Record<string, unknown>, R>({
      callId: `call_${randomUUID()}`,
      correlationId,
      caller,
      callee,
      action,
      payload: payload as Record<string, unknown>,
      metadata: { timestamp: new Date().toISOString(), timeoutMs }
    });
    if (res.status !== 'SUCCESS' || res.data === undefined || res.data === null) {
      throw new Error(res.error?.message ?? `${callee} did not answer '${action}'`);
    }
    return res.data;
  }

  private emit<T extends TaskEvent['type']>(taskId: string, type: T, data: Extract<TaskEvent, { type: T }>['data']): void {
    if (type !== 'task.progress') this.activeTasks.delete(taskId);
    this.bus.publish({ eventId: randomUUID(), taskId, at: new Date().toISOString(), type, data } as TaskEvent);
  }

  private fail(taskId: string, reason: string): void {
    this.emit(taskId, 'task.failed', { reason });
  }
}

/**
 * Which listing does "the Sony one" / "the second one" / "the cheapest" mean?
 * Falls back to ARB's top recommendation.
 */
export function pickListing(listings: MerchantListing[], query: string): MerchantListing {
  const q = query.toLowerCase();
  const ordinals: Array<[RegExp, number]> = [
    [/\b(first|1st|top)\b/, 0], [/\b(second|2nd)\b/, 1], [/\b(third|3rd)\b/, 2], [/\b(fourth|4th)\b/, 3], [/\b(fifth|5th)\b/, 4]
  ];
  for (const [re, i] of ordinals) if (re.test(q) && listings[i]) return listings[i];
  if (/\b(cheapest|lowest)\b/.test(q)) {
    return listings.reduce((best, l) => (l.totalLandedCost < best.totalLandedCost ? l : best));
  }

  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  let best = listings[0];
  let bestScore = 0;
  for (const l of listings) {
    const hay = `${l.productTitle} ${l.merchantName} ${l.merchantDomain}`.toLowerCase();
    const score = words.filter((w) => hay.includes(w)).length;
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  return best;
}

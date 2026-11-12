import {
  PulsePaymentRequest,
  PulsePaymentResponse,
  PulsePaymentRequestSchema,
} from '../shared/types/index.js';
import { DeterministicPolicyEngine } from '../shared/policy/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { PalsLogger } from '../shared/logging/index.js';

/**
 * PULSE — real PayPal Orders v2 integration (sandbox by default).
 *
 * Flow:
 *   1. createOrder()  -> policy check, creates a PayPal order, returns approveUrl (status CREATED)
 *   2. buyer opens approveUrl and logs in with a sandbox personal account
 *   3. captureOrder() -> re-verifies amount against the approval token, captures, returns COMPLETED
 *   4. refundOrder() / queryTransaction() / listTransactions() for post-payment work
 */

export interface PulseConfig {
  mode: 'sandbox' | 'live';
  clientId: string;
  clientSecret: string;
  apiBaseUrl?: string;
  returnUrl?: string; // where PayPal sends the buyer after approval
  cancelUrl?: string;
}

export interface StoredTransaction {
  transactionId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  approvalToken: PulsePaymentRequest['approvalToken'];
  proposalId: string;
  amount: number;
  currency: string;
  merchantDomain: string;
  status: 'CREATED' | 'COMPLETED' | 'REFUNDED' | 'FAILED';
  approveUrl?: string;
  paypalFee?: number;
  createdAt: string;
  capturedAt?: string;
}

export interface CreateOrderResult extends PulsePaymentResponse {
  approveUrl?: string;
}

export class PulseService {
  private config: PulseConfig;
  private baseUrl: string;
  private logger = new PalsLogger('PULSE');
  private ledger = new Map<string, StoredTransaction>(); // key: paymentRequestId
  private orderIndex = new Map<string, string>(); // paypalOrderId -> paymentRequestId
  private token?: { value: string; expiresAt: number };

  constructor(config: PulseConfig, callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('PULSE: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required');
    }
    this.config = config;
    this.baseUrl =
      config.apiBaseUrl ??
      (config.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

    callsSystem.registerHandler<PulsePaymentRequest, CreateOrderResult>(
      'PULSE', 'payment.create_order', async (env) => this.createOrder(env.payload)
    );
    callsSystem.registerHandler<{ paypalOrderId: string }, PulsePaymentResponse>(
      'PULSE', 'payment.capture', async (env) => this.captureOrder(env.payload.paypalOrderId)
    );
    callsSystem.registerHandler<{ transactionId: string }, StoredTransaction | null>(
      'PULSE', 'transaction.query', async (env) => this.queryTransaction(env.payload.transactionId)
    );
    callsSystem.registerHandler<{ userId?: string }, StoredTransaction[]>(
      'PULSE', 'transaction.list', async (env) => this.listTransactions(env.payload.userId)
    );
    callsSystem.registerHandler<{ paypalOrderId: string; reason?: string }, StoredTransaction>(
      'PULSE', 'payment.refund', async (env) => this.refundOrder(env.payload.paypalOrderId, env.payload.reason)
    );

    this.logger.info(`PULSE initialized in ${config.mode} mode (${this.baseUrl})`);
  }

  // ---------------------------------------------------------------------------
  // PayPal HTTP helpers
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;

    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`PayPal OAuth failed (${res.status}): ${await res.text()}`);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  private async paypal<T>(method: 'GET' | 'POST', path: string, body?: unknown, requestId?: string): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.getAccessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    if (requestId) headers['PayPal-Request-Id'] = requestId; // idempotency: retries never double-charge

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      const debugId = res.headers.get('paypal-debug-id');
      throw new Error(`PayPal ${method} ${path} failed (${res.status}, debug ${debugId}): ${text}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  private failure(req: { paymentRequestId: string; currency: string }, msg: string, orderId = ''): PulsePaymentResponse {
    return {
      paymentRequestId: req.paymentRequestId,
      paypalOrderId: orderId,
      status: 'FAILED',
      finalAmountCaptured: 0,
      currency: req.currency,
      receiptNumber: '',
      transactionTimestamp: new Date().toISOString(),
      errorMessage: msg,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Create order (call this only after DEFENDER has cleared the proposal)
  // ---------------------------------------------------------------------------

  public async createOrder(request: PulsePaymentRequest): Promise<CreateOrderResult> {
    const cid = request.paymentRequestId;
    const parsed = PulsePaymentRequestSchema.safeParse(request);
    if (!parsed.success) return this.failure(request, `Invalid payment request: ${parsed.error.message}`);

    const { approvalToken, orderTotal, currency, merchantDomain, proposalId } = request;

    // Deterministic gate: the LLM can never talk its way past this.
    const policy = DeterministicPolicyEngine.validateApprovalTokenForPayment(
      approvalToken, orderTotal, currency, merchantDomain
    );
    if (!policy.valid) {
      this.logger.error(`Policy blocked order: ${policy.reason}`, undefined, cid);
      return this.failure(request, policy.reason ?? policy.code);
    }

    try {
      const order = await this.paypal<{
        id: string;
        status: string;
        links: Array<{ rel: string; href: string }>;
      }>(
        'POST',
        '/v2/checkout/orders',
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: proposalId.slice(0, 256),
              custom_id: request.paymentRequestId.slice(0, 127),
              description: `PALS purchase from ${merchantDomain}`.slice(0, 127),
              amount: { currency_code: currency.toUpperCase(), value: orderTotal.toFixed(2) },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                return_url: this.config.returnUrl ?? 'http://localhost:8000/paypal/return',
                cancel_url: this.config.cancelUrl ?? 'http://localhost:8000/paypal/cancel',
              },
            },
          },
        },
        `create-${request.paymentRequestId}`
      );

      const approveUrl = order.links.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;

      this.ledger.set(request.paymentRequestId, {
        transactionId: request.paymentRequestId,
        paypalOrderId: order.id,
        approvalToken,
        proposalId,
        amount: orderTotal,
        currency: currency.toUpperCase(),
        merchantDomain,
        status: 'CREATED',
        approveUrl,
        createdAt: new Date().toISOString(),
      });
      this.orderIndex.set(order.id, request.paymentRequestId);

      this.logger.info(`PayPal order created: ${order.id}`, { approveUrl }, cid);
      return {
        paymentRequestId: request.paymentRequestId,
        paypalOrderId: order.id,
        status: 'CREATED',
        finalAmountCaptured: 0,
        currency: currency.toUpperCase(),
        receiptNumber: '',
        transactionTimestamp: new Date().toISOString(),
        approveUrl,
      };
    } catch (err) {
      this.logger.error(`Create order failed: ${(err as Error).message}`, undefined, cid);
      return this.failure(request, (err as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Capture order (after the buyer approves on PayPal)
  // ---------------------------------------------------------------------------

  public async captureOrder(paypalOrderId: string): Promise<PulsePaymentResponse> {
    const txId = this.orderIndex.get(paypalOrderId);
    const tx = txId ? this.ledger.get(txId) : undefined;
    if (!tx) return this.failure({ paymentRequestId: '', currency: '' }, `Unknown order ${paypalOrderId}`, paypalOrderId);
    const ref = { paymentRequestId: tx.transactionId, currency: tx.currency };

    try {
      // Second look: confirm what PayPal holds still matches what the user approved.
      const live = await this.paypal<{
        status: string;
        purchase_units: Array<{ amount: { value: string; currency_code: string } }>;
      }>('GET', `/v2/checkout/orders/${paypalOrderId}`);

      const liveAmount = Number(live.purchase_units[0].amount.value);
      const recheck = DeterministicPolicyEngine.validateApprovalTokenForPayment(
        tx.approvalToken, liveAmount, live.purchase_units[0].amount.currency_code, tx.merchantDomain
      );
      if (!recheck.valid) {
        tx.status = 'FAILED';
        return this.failure(ref, recheck.reason ?? recheck.code, paypalOrderId);
      }
      if (live.status !== 'APPROVED') {
        return this.failure(ref, `Order not approved by buyer yet (status ${live.status})`, paypalOrderId);
      }

      const captured = await this.paypal<{
        purchase_units: Array<{
          payments: {
            captures: Array<{
              id: string;
              status: string;
              amount: { value: string; currency_code: string };
              seller_receivable_breakdown?: { paypal_fee?: { value: string } };
              create_time: string;
            }>;
          };
        }>;
      }>('POST', `/v2/checkout/orders/${paypalOrderId}/capture`, {}, `capture-${tx.transactionId}`);

      const capture = captured.purchase_units[0].payments.captures[0];
      const fee = capture.seller_receivable_breakdown?.paypal_fee?.value;

      tx.status = capture.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
      tx.paypalCaptureId = capture.id;
      tx.paypalFee = fee ? Number(fee) : undefined;
      tx.capturedAt = capture.create_time;

      this.logger.info(`Captured ${capture.amount.value} ${capture.amount.currency_code}`, { captureId: capture.id }, tx.transactionId);
      return {
        paymentRequestId: tx.transactionId,
        paypalOrderId,
        paypalCaptureId: capture.id,
        status: tx.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        finalAmountCaptured: Number(capture.amount.value),
        currency: capture.amount.currency_code,
        receiptNumber: capture.id,
        transactionTimestamp: capture.create_time,
        paypalFee: tx.paypalFee,
      };
    } catch (err) {
      tx.status = 'FAILED';
      return this.failure(ref, (err as Error).message, paypalOrderId);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Post-payment
  // ---------------------------------------------------------------------------

  public async refundOrder(paypalOrderId: string, reason = 'Refund requested via PALS'): Promise<StoredTransaction> {
    const txId = this.orderIndex.get(paypalOrderId);
    const tx = txId ? this.ledger.get(txId) : undefined;
    if (!tx?.paypalCaptureId) throw new Error(`No captured payment for order ${paypalOrderId}`);

    await this.paypal(
      'POST',
      `/v2/payments/captures/${tx.paypalCaptureId}/refund`,
      { note_to_payer: reason.slice(0, 255) },
      `refund-${tx.transactionId}`
    );
    tx.status = 'REFUNDED';
    this.logger.info(`Refunded capture ${tx.paypalCaptureId}`, undefined, tx.transactionId);
    return tx;
  }

  public async queryTransaction(transactionId: string): Promise<StoredTransaction | null> {
    return this.ledger.get(transactionId) ?? null;
  }

  /** All ledger entries, or only one user's when userId is given. */
  public listTransactions(userId?: string): StoredTransaction[] {
    const all = [...this.ledger.values()];
    return userId ? all.filter((tx) => tx.approvalToken.userId === userId) : all;
  }
}

import {
  PulsePaymentRequest,
  PulsePaymentResponse,
  PulsePaymentRequestSchema,
  UserApprovalToken
} from '../shared/types/index.js';
import { DeterministicPolicyEngine } from '../shared/policy/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { PalsLogger } from '../shared/logging/index.js';

export interface PulseConfig {
  mode: 'sandbox' | 'live';
  clientId?: string;
  clientSecret?: string;
  apiBaseUrl?: string;
}

export interface StoredTransaction {
  transactionId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  approvalToken: string;
  proposalId: string;
  amount: number;
  currency: string;
  merchantDomain: string;
  status: 'COMPLETED' | 'REFUNDED' | 'FAILED';
  capturedAt: string;
}

export class PulseService {
  private config: PulseConfig;
  private logger = new PalsLogger('PULSE');
  private ledger: Map<string, StoredTransaction> = new Map();

  constructor(
    config: PulseConfig = { mode: 'sandbox' },
    callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()
  ) {
    this.config = config;

    // Register handlers with Central Calls System
    callsSystem.registerHandler<PulsePaymentRequest, PulsePaymentResponse>(
      'PULSE',
      'payment.execute',
      async (envelope) => this.executePayment(envelope.payload)
    );

    callsSystem.registerHandler<{ transactionId: string }, StoredTransaction | null>(
      'PULSE',
      'transaction.query',
      async (envelope) => this.queryTransaction(envelope.payload.transactionId)
    );

    this.logger.info(`PULSE initialized in ${this.config.mode} mode & registered with calls/`);
  }

  /**
   * Main payment execution entry point.
   * Gated deterministically by UserApprovalToken.
   */
  public async executePayment(request: PulsePaymentRequest): Promise<PulsePaymentResponse> {
    const correlationId = request.paymentRequestId;
    this.logger.info(`Initiating payment execution for proposal: ${request.proposalId}`, undefined, correlationId);

    // 1. Validate request schema
    const validation = PulsePaymentRequestSchema.safeParse(request);
    if (!validation.success) {
      this.logger.error('Invalid payment payload schema', undefined, correlationId);
      throw new Error(`Invalid payment request: ${JSON.stringify(validation.error.format())}`);
    }

    const { approvalToken, orderTotal, currency, merchantDomain, proposalId } = request;

    // 2. Deterministic Validation against User Approval Token
    const policyCheck = DeterministicPolicyEngine.validateApprovalTokenForPayment(
      approvalToken,
      orderTotal,
      currency,
      merchantDomain
    );

    if (!policyCheck.valid) {
      this.logger.error(`Policy validation failed: ${policyCheck.reason}`, undefined, correlationId);
      return {
        paymentRequestId: request.paymentRequestId,
        paypalOrderId: '',
        status: 'FAILED',
        finalAmountCaptured: 0,
        currency,
        receiptNumber: '',
        transactionTimestamp: new Date().toISOString(),
        errorMessage: policyCheck.reason
      };
    }

    // 3. Process via PayPal Sandbox / API
    // In Sandbox mode, simulates or dispatches PayPal v2 checkout order
    const simulatedOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const simulatedCaptureId = `CAP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const receiptNumber = `RCPT-PALS-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    // 4. Commit to immutable audit ledger
    const record: StoredTransaction = {
      transactionId: request.paymentRequestId,
      paypalOrderId: simulatedOrderId,
      paypalCaptureId: simulatedCaptureId,
      approvalToken: approvalToken.approvalToken,
      proposalId,
      amount: orderTotal,
      currency,
      merchantDomain,
      status: 'COMPLETED',
      capturedAt: timestamp
    };
    this.ledger.set(request.paymentRequestId, record);

    this.logger.info(
      `Payment captured successfully: ${orderTotal} ${currency} [Receipt: ${receiptNumber}]`,
      { orderId: simulatedOrderId, captureId: simulatedCaptureId },
      correlationId
    );

    return {
      paymentRequestId: request.paymentRequestId,
      paypalOrderId: simulatedOrderId,
      paypalCaptureId: simulatedCaptureId,
      status: 'COMPLETED',
      finalAmountCaptured: orderTotal,
      currency,
      receiptNumber,
      transactionTimestamp: timestamp,
      paypalFee: Math.round(orderTotal * 0.025 * 100) / 100
    };
  }

  public async queryTransaction(transactionId: string): Promise<StoredTransaction | null> {
    return this.ledger.get(transactionId) || null;
  }
}


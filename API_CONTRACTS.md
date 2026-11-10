# PALS API Contracts & Interface Specifications

> **Document Version:** 1.0.0  
> **Lifecycle Phase:** Phase 0 (Interface Definitions & Type Schemas)  
> **Audience:** AI Coding Agents & Backend Integration Engineers  
> **Rule:** All inter-agent communication, orchestrator calls, and task payloads must adhere strictly to these JSON Schemas / TypeScript interfaces.

---

## 0. Central Calls System Envelope Contracts (`calls/`)

All communication between PALS is mediated through `calls/`. The standard envelope wraps all domain-specific payloads.

```typescript
export type PALIdentifier = 'GLY' | 'ARB' | 'PULSE' | 'DEFENDER';

export interface PalCallEnvelope<T = unknown> {
  callId: string;             // Unique invocation ID: call_[ulid]
  correlationId: string;      // Traces conversational thread or root task ID: corr_[ulid]
  caller: PALIdentifier;      // Originating PAL
  callee: PALIdentifier;      // Target PAL
  action: string;             // Method name (e.g. 'research.start', 'payment.authorize')
  payload: T;                 // Action-specific payload defined below
  metadata: {
    timestamp: string;        // ISO 8601
    timeoutMs: number;        // Maximum execution time before timeout
    idempotencyKey?: string;  // Prevents duplicate operations
  };
}

export interface PalCallResponse<R = unknown> {
  callId: string;
  correlationId: string;
  responder: PALIdentifier;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'QUEUED';
  data?: R;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  durationMs: number;
  completedAt: string;
}
```

## 1. Conversational Gateway & Orchestrator Contracts

### 1.1 Inbound User Message Request
Sent from frontend clients to GLY.

```typescript
export interface InboundChatMessageRequest {
  conversationId: string;
  userId: string;
  messageId: string;
  content: string;
  timestamp: string; // ISO 8601
  clientContext?: {
    deviceType: 'desktop' | 'mobile_android' | 'mobile_ios';
    timezone: string;
    locale: string;
  };
}
```

### 1.2 Orchestrator Task Delegation Contract
Dispatched by GLY to the Orchestrator when an asynchronous task (e.g., research or payment preparation) is recognized.

```typescript
export type TaskType = 'RESEARCH' | 'NEGOTIATION' | 'PURCHASE_PREP' | 'PAYMENT_CAPTURE' | 'KNOWLEDGE_RETRIEVAL';

export interface TaskDelegationRequest {
  taskId: string;           // Format: tsk_[ulid]
  conversationId: string;
  userId: string;
  targetPal: 'ARB' | 'PULSE' | 'DEFENDER' | 'GLY';
  taskType: TaskType;
  priority: 'low' | 'normal' | 'high';
  payload: Record<string, unknown>;
  userLimits: {
    maxBudget?: number;
    currency: string;
    merchantAllowlist?: string[];
    merchantBlocklist?: string[];
  };
  createdAt: string;
}

export interface TaskDelegationResponse {
  taskId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  estimatedDurationMs?: number;
  acknowledgmentMessage: string;
}
```

### 1.3 Asynchronous Task Event Notification
Emitted by background workers (e.g., ARB) to the central task bus, consumed by the Orchestrator, and routed back to GLY.

```typescript
export type TaskStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'RESEARCHING'
  | 'PROCESSING'
  | 'AWAITING_INPUT'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TaskLifecycleEvent {
  eventId: string;
  taskId: string;
  conversationId: string;
  targetPal: 'ARB' | 'PULSE' | 'DEFENDER' | 'GLY';
  status: TaskStatus;
  progressPercent?: number; // 0 - 100
  statusMessage?: string;
  resultPayload?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  emittedAt: string;
}
```

---

## 2. GLY (GuidePal) Knowledge & RAG Contracts

### 2.1 RAG Query & Response
Used internally by GLY to query the PayPal Vector Store.

```typescript
export interface PayPalKnowledgeQuery {
  queryText: string;
  categoryFilter?: 'FEES' | 'DISPUTES' | 'KYC' | 'INTEGRATION' | 'BUYER_PROTECTION' | 'GENERAL';
  topK?: number; // default: 5
  minConfidenceScore?: number; // default: 0.75
}

export interface PayPalKnowledgeReference {
  documentId: string;
  title: string;
  url: string;
  contentSnippet: string;
  score: number;
  section: string;
}

export interface PayPalKnowledgeResponse {
  answer: string;
  references: PayPalKnowledgeReference[];
  confidenceScore: number;
  requiresAccountLookup: boolean;
}
```

---

## 3. ARB (ArbitrationPal) Contracts

### 3.1 Research Task Payload
Passed in `TaskDelegationRequest.payload` when `targetPal === 'ARB'` and `taskType === 'RESEARCH'`.

```typescript
export interface ARBResearchPayload {
  productQuery: string;
  category?: string;
  budgetCeiling: number;
  currency: string;
  mandatorySpecifications: Record<string, string | number | boolean>;
  preferredBrands?: string[];
  excludedBrands?: string[];
  deliveryPostalCode?: string;
  minMerchantTrustScore?: number; // 0 - 100, default: 80
}

export interface MerchantListing {
  merchantId: string;
  merchantName: string;
  merchantDomain: string;
  productTitle: string;
  productUrl: string;
  sku: string;
  itemPrice: number;
  estimatedShipping: number;
  estimatedTax: number;
  totalLandedCost: number;
  currency: string;
  inStock: boolean;
  warrantyPeriodMonths?: number;
  trustScore: number; // 0 - 100
  trustReasons: string[];
  pros: string[];
  cons: string[];
}

export interface ARBResearchResult {
  taskId: string;
  totalListingsScanned: number;
  qualifyingListingsFound: number;
  topRecommendations: MerchantListing[];
  arbitrationSummary: string;
}
```

### 3.2 Purchase Preparation Proposal
Generated by ARB when the user selects an item to purchase.

```typescript
export interface PurchaseProposal {
  proposalId: string;        // Format: prop_[ulid]
  taskId: string;
  merchantName: string;
  merchantDomain: string;
  checkoutUrl: string;
  productTitle: string;
  sku: string;
  variant: {
    color?: string;
    size?: string;
    specs?: Record<string, string>;
  };
  pricingBreakdown: {
    basePrice: number;
    discountApplied: number;
    shippingFee: number;
    taxes: number;
    totalPayable: number;
    currency: string;
  };
  negotiationLog?: {
    attempted: boolean;
    successful: boolean;
    savingsAmount: number;
    description: string;
  };
  merchantTrustScore: number;
  expiresAt: string; // ISO 8601, max 15 minutes
}
```

---

## 4. User Approval & Policy Engine Contracts

### 4.1 Cryptographic User Approval Token
Generated by the client UI upon explicit user confirmation.

```typescript
export interface UserApprovalToken {
  approvalToken: string;     // Format: apprv_[ulid]
  proposalId: string;
  userId: string;
  authorizedMaxAmount: number; // Invariant: Final transaction <= authorizedMaxAmount
  authorizedCurrency: string;
  authorizedMerchantDomain: string;
  userSignature: string;      // Client-signed payload
  issuedAt: string;
  expiresAt: string;          // 15-minute validity window
}

export interface PolicyValidationResult {
  valid: boolean;
  code: 'OK' | 'EXCEEDS_SINGLE_LIMIT' | 'EXCEEDS_DAILY_LIMIT' | 'BLOCKED_MERCHANT' | 'CURRENCY_MISMATCH' | 'EXPIRED_TOKEN';
  reason?: string;
}
```

---

## 5. DEFENDER Security Assessment Contract (Phase 4)

Interface slot executed immediately prior to PULSE in the checkout chain.

```typescript
export interface DefenderAssessmentRequest {
  assessmentId: string;
  approvalToken: UserApprovalToken;
  purchaseProposal: PurchaseProposal;
  clientMetadata: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface DefenderAssessmentResponse {
  decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW_REQUIRED';
  riskScore: number; // 0.00 (Safe) to 1.00 (High Risk)
  flaggedThreats: Array<{
    type: 'PROMPT_INJECTION' | 'SCAM_DOMAIN' | 'PRICE_TAMPERING' | 'ABNORMAL_VELOCITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    details: string;
  }>;
  evaluatedAt: string;
}
```

---

## 6. PULSE (PaymentPal) Contracts

### 6.1 Payment Authorization & Capture Request
Submitted by Orchestrator to PULSE after Policy and Defender clearance.

```typescript
export interface PulsePaymentRequest {
  paymentRequestId: string;   // Format: payreq_[ulid]
  approvalToken: UserApprovalToken;
  proposalId: string;
  merchantDomain: string;
  orderTotal: number;
  currency: string;
  paymentMethod: 'PAYPAL_ORDER' | 'PAYPAL_VAULT';
}

export interface PulsePaymentResponse {
  paymentRequestId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  status: 'CREATED' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED';
  finalAmountCaptured: number;
  currency: string;
  receiptNumber: string;
  transactionTimestamp: string;
  paypalFee?: number;
  errorMessage?: string;
}
```

### 6.3 Payment Action Contracts

### 6.3.1 payment.create_order
Submitted by Orchestrator to PULSE to create a PayPal order after policy clearance.

```typescript
export interface PaymentCreateOrderAction {
  action: 'payment.create_order';
  payload: PulsePaymentRequest;
}
export type PaymentCreateOrderResponse = PulsePaymentResponse;
```

### 6.3.2 payment.capture
Submitted by Orchestrator to PULSE to capture a created PayPal order after buyer approval and amount verification.

```typescript
export interface PaymentCaptureAction {
  action: 'payment.capture';
  payload: { paypalOrderId: string };
}
export type PaymentCaptureResponse = PulsePaymentResponse;
```

### 6.3.3 payment.refund
Submitted by Orchestrator to PULSE to refund a captured payment.

```typescript
export interface PaymentRefundAction {
  action: 'payment.refund';
  payload: { paypalOrderId: string; reason?: string };
}
export type PaymentRefundResponse = StoredTransaction;
```
Standard PayPal Webhook Event format ingested by PULSE.

```typescript
export interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: 'CHECKOUT.ORDER.COMPLETED' | 'PAYMENT.CAPTURE.COMPLETED' | 'PAYMENT.CAPTURE.DENIED' | 'PAYMENT.CAPTURE.REFUNDED';
  summary: string;
  resource: Record<string, unknown>;
}
```

### 6.3 Dispute Copilot Contracts

```typescript
export type DisputeReason = 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' | 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED' | 'UNAUTHORISED';

export interface DisputeClaim {
  disputeId: string;
  paypalOrderId: string;
  createTime: string;
  disputeAmount: {
    value: string;
    currencyCode: string;
  };
  reason: DisputeReason;
  status: 'REQUIRED_ACTION' | 'UNDER_REVIEW' | 'RESOLVED';
  buyer: {
    name: string;
    email: string;
    pastDisputeCount: number;
    serialDisputerFlag: boolean;
  };
  sellerResponseDueDate: string;
  winLikelihoodScore: number; // 0 to 100
  recommendedAction: 'SUBMIT_EVIDENCE' | 'ACCEPT_AND_REFUND';
}

export interface DisputeEvidenceDraft {
  disputeId: string;
  draftedResponseText: string;
  supportingDocuments: Array<{
    type: 'PROOF_OF_DELIVERY' | 'CARRIER_TRACKING' | 'CUSTOMER_COMMUNICATION' | 'TERMS_OF_SERVICE';
    referenceUrl: string;
    snippet: string;
  }>;
  sellerProtectionEligible: boolean;
}

export interface DisputeActionSubmission {
  disputeId: string;
  action: 'PROVIDE_EVIDENCE' | 'ACCEPT_CLAIM';
  evidenceText?: string;
  trackingNumber?: string;
  carrierName?: string;
}
```


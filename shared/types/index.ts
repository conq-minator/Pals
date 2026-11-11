import { z } from 'zod';

// ============================================================================
// 0. Central Calls System Envelopes (calls/)
// ============================================================================

export const PALIdentifierSchema = z.enum(['GLY', 'ARB', 'PULSE', 'DEFENDER', 'ORCHESTRATOR']);
export type PALIdentifier = z.infer<typeof PALIdentifierSchema>;

export const PalCallEnvelopeSchema = z.object({
  callId: z.string().min(1),
  correlationId: z.string().min(1),
  caller: PALIdentifierSchema,
  callee: PALIdentifierSchema,
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.object({
    timestamp: z.string().datetime(),
    timeoutMs: z.number().positive().default(30000),
    idempotencyKey: z.string().optional()
  })
});
export type PalCallEnvelope<T = Record<string, unknown>> = z.infer<typeof PalCallEnvelopeSchema> & {
  payload: T;
};

export const PalCallResponseSchema = z.object({
  callId: z.string().min(1),
  correlationId: z.string().min(1),
  responder: PALIdentifierSchema,
  status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT', 'QUEUED']),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  }).optional(),
  durationMs: z.number().nonnegative(),
  completedAt: z.string().datetime()
});
export type PalCallResponse<R = unknown> = z.infer<typeof PalCallResponseSchema> & {
  data?: R;
};

// ============================================================================
// 1. Inbound Chat & Conversation Schemas
// ============================================================================

export const InboundChatMessageRequestSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().min(1),
  timestamp: z.string().datetime(),
  clientContext: z.object({
    deviceType: z.enum(['desktop', 'mobile_android', 'mobile_ios']).default('desktop'),
    timezone: z.string().default('UTC'),
    locale: z.string().default('en-US')
  }).optional()
});
export type InboundChatMessageRequest = z.infer<typeof InboundChatMessageRequestSchema>;

export const TaskTypeSchema = z.enum([
  'RESEARCH',
  'NEGOTIATION',
  'PURCHASE_PREP',
  'PAYMENT_CAPTURE',
  'KNOWLEDGE_RETRIEVAL'
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'RESEARCHING',
  'PROCESSING',
  'AWAITING_INPUT',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskDelegationRequestSchema = z.object({
  taskId: z.string().min(1),
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  targetPal: PALIdentifierSchema,
  taskType: TaskTypeSchema,
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  payload: z.record(z.string(), z.unknown()),
  userLimits: z.object({
    maxBudget: z.number().positive().optional(),
    currency: z.string().default('INR'),
    merchantAllowlist: z.array(z.string()).optional(),
    merchantBlocklist: z.array(z.string()).optional()
  }),
  createdAt: z.string().datetime()
});
export type TaskDelegationRequest = z.infer<typeof TaskDelegationRequestSchema>;

export const TaskLifecycleEventSchema = z.object({
  eventId: z.string().min(1),
  taskId: z.string().min(1),
  conversationId: z.string().min(1),
  targetPal: PALIdentifierSchema,
  status: TaskStatusSchema,
  progressPercent: z.number().min(0).max(100).optional(),
  statusMessage: z.string().optional(),
  resultPayload: z.record(z.string(), z.unknown()).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  }).optional(),
  emittedAt: z.string().datetime()
});
export type TaskLifecycleEvent = z.infer<typeof TaskLifecycleEventSchema>;

// ============================================================================
// 2. GLY Knowledge & RAG Schemas
// ============================================================================

export const PayPalKnowledgeQuerySchema = z.object({
  queryText: z.string().min(1),
  categoryFilter: z.enum(['FEES', 'DISPUTES', 'KYC', 'INTEGRATION', 'BUYER_PROTECTION', 'GENERAL']).optional(),
  topK: z.number().int().positive().default(5),
  minConfidenceScore: z.number().min(0).max(1).default(0.7)
});
export type PayPalKnowledgeQuery = z.infer<typeof PayPalKnowledgeQuerySchema>;

export const PayPalKnowledgeReferenceSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string(),
  contentSnippet: z.string(),
  score: z.number(),
  section: z.string()
});
export type PayPalKnowledgeReference = z.infer<typeof PayPalKnowledgeReferenceSchema>;

export const PayPalKnowledgeResponseSchema = z.object({
  answer: z.string(),
  references: z.array(PayPalKnowledgeReferenceSchema),
  confidenceScore: z.number(),
  requiresAccountLookup: z.boolean().default(false)
});
export type PayPalKnowledgeResponse = z.infer<typeof PayPalKnowledgeResponseSchema>;

// ============================================================================
// 3. ARB Market Research & Purchase Proposals
// ============================================================================

export const ARBResearchPayloadSchema = z.object({
  productQuery: z.string().min(1),
  category: z.string().optional(),
  budgetCeiling: z.number().positive(),
  currency: z.string().default('INR'),
  mandatorySpecifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  preferredBrands: z.array(z.string()).optional(),
  excludedBrands: z.array(z.string()).optional(),
  targetMerchants: z.array(z.string()).optional(),
  deliveryPostalCode: z.string().optional(),
  minMerchantTrustScore: z.number().min(0).max(100).default(80),
  softPreferences: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  quantity: z.number().int().positive().optional(),
  deliveryBy: z.string().optional(),
  budgetFlexibility: z.enum(['STRICT', 'FLEXIBLE_10_PERCENT', 'FLEXIBLE_20_PERCENT']).optional(),
  allowAmbiguousGuess: z.boolean().optional()
});
export type ARBResearchPayload = z.infer<typeof ARBResearchPayloadSchema>;
/** Caller-facing shape: fields with schema defaults may be omitted. */
export type ARBResearchPayloadInput = z.input<typeof ARBResearchPayloadSchema>;

export const MerchantListingSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  merchantDomain: z.string(),
  productTitle: z.string(),
  productUrl: z.string(),
  sku: z.string(),
  itemPrice: z.number().nonnegative(),
  estimatedShipping: z.number().nonnegative(),
  estimatedTax: z.number().nonnegative(),
  totalLandedCost: z.number().nonnegative(),
  currency: z.string(),
  inStock: z.boolean(),
  warrantyPeriodMonths: z.number().optional(),
  trustScore: z.number().min(0).max(100),
  trustReasons: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  unverifiedSpecs: z.array(z.string()).optional()
});
export type MerchantListing = z.infer<typeof MerchantListingSchema>;

export const ARBResearchResultSchema = z.object({
  taskId: z.string(),
  totalListingsScanned: z.number().int().nonnegative(),
  qualifyingListingsFound: z.number().int().nonnegative(),
  topRecommendations: z.array(MerchantListingSchema),
  arbitrationSummary: z.string(),
  needsInput: z.boolean().optional(),
  inputQuestion: z.string().optional(),
  inputOptions: z.array(z.string()).optional()
});
export type ARBResearchResult = z.infer<typeof ARBResearchResultSchema>;

export const PurchaseProposalSchema = z.object({
  proposalId: z.string().min(1),
  taskId: z.string().min(1),
  merchantName: z.string(),
  merchantDomain: z.string(),
  checkoutUrl: z.string(),
  productTitle: z.string(),
  sku: z.string(),
  variant: z.object({
    color: z.string().optional(),
    size: z.string().optional(),
    specs: z.record(z.string(), z.string()).optional()
  }).default({}),
  pricingBreakdown: z.object({
    basePrice: z.number().nonnegative(),
    discountApplied: z.number().nonnegative().default(0),
    shippingFee: z.number().nonnegative().default(0),
    taxes: z.number().nonnegative().default(0),
    totalPayable: z.number().positive(),
    currency: z.string()
  }),
  negotiationLog: z.object({
    attempted: z.boolean(),
    successful: z.boolean(),
    savingsAmount: z.number().nonnegative(),
    description: z.string()
  }).optional(),
  merchantTrustScore: z.number().min(0).max(100),
  supportedPaymentMethods: z.array(z.string()).optional(),
  prefilledShipping: z.record(z.string(), z.string()).optional(),
  pulseHandoffPayload: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime()
});
export type PurchaseProposal = z.infer<typeof PurchaseProposalSchema>;

// ============================================================================
// 4. User Approvals & Deterministic Policy Contracts
// ============================================================================

export const UserApprovalTokenSchema = z.object({
  approvalToken: z.string().min(1),
  proposalId: z.string().min(1),
  userId: z.string().min(1),
  authorizedMaxAmount: z.number().positive(),
  authorizedCurrency: z.string(),
  authorizedMerchantDomain: z.string(),
  userSignature: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});
export type UserApprovalToken = z.infer<typeof UserApprovalTokenSchema>;

export const PolicyValidationResultSchema = z.object({
  valid: z.boolean(),
  code: z.enum([
    'OK',
    'EXCEEDS_SINGLE_LIMIT',
    'EXCEEDS_DAILY_LIMIT',
    'BLOCKED_MERCHANT',
    'CURRENCY_MISMATCH',
    'EXPIRED_TOKEN',
    'DOMAIN_MISMATCH'
  ]),
  reason: z.string().optional()
});
export type PolicyValidationResult = z.infer<typeof PolicyValidationResultSchema>;

// ============================================================================
// 5. DEFENDER Security Assessment Contracts
// ============================================================================

export const DefenderAssessmentRequestSchema = z.object({
  assessmentId: z.string().min(1),
  approvalToken: UserApprovalTokenSchema,
  purchaseProposal: PurchaseProposalSchema,
  clientMetadata: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional()
  }).default({})
});
export type DefenderAssessmentRequest = z.infer<typeof DefenderAssessmentRequestSchema>;

export const DefenderAssessmentResponseSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'MANUAL_REVIEW_REQUIRED']),
  riskScore: z.number().min(0).max(1),
  flaggedThreats: z.array(z.object({
    type: z.enum(['PROMPT_INJECTION', 'SCAM_DOMAIN', 'PRICE_TAMPERING', 'ABNORMAL_VELOCITY']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    details: z.string()
  })),
  evaluatedAt: z.string().datetime()
});
export type DefenderAssessmentResponse = z.infer<typeof DefenderAssessmentResponseSchema>;

// ============================================================================
// 6. PULSE Payment Contracts
// ============================================================================

export const PulsePaymentRequestSchema = z.object({
  paymentRequestId: z.string().min(1),
  approvalToken: UserApprovalTokenSchema,
  proposalId: z.string().min(1),
  merchantDomain: z.string(),
  orderTotal: z.number().positive(),
  currency: z.string(),
  paymentMethod: z.enum(['PAYPAL_ORDER', 'PAYPAL_VAULT']).default('PAYPAL_ORDER')
});
export type PulsePaymentRequest = z.infer<typeof PulsePaymentRequestSchema>;

export const PulsePaymentResponseSchema = z.object({
  paymentRequestId: z.string(),
  paypalOrderId: z.string(),
  paypalCaptureId: z.string().optional(),
  status: z.enum(['CREATED', 'AUTHORIZED', 'COMPLETED', 'FAILED']),
  finalAmountCaptured: z.number().nonnegative(),
  currency: z.string(),
  receiptNumber: z.string(),
  transactionTimestamp: z.string().datetime(),
  paypalFee: z.number().optional(),
  errorMessage: z.string().optional()
});
export type PulsePaymentResponse = z.infer<typeof PulsePaymentResponseSchema>;


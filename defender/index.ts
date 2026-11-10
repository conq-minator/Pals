import {
  DefenderAssessmentRequest,
  DefenderAssessmentResponse,
  DefenderAssessmentRequestSchema
} from '../shared/types/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { PalsLogger } from '../shared/logging/index.js';

export class DefenderService {
  private logger = new PalsLogger('DEFENDER');

  constructor(callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()) {
    // Register action with Central Calls System
    callsSystem.registerHandler<DefenderAssessmentRequest, DefenderAssessmentResponse>(
      'DEFENDER',
      'security.assess_transaction',
      async (envelope) => this.assessTransaction(envelope.payload)
    );
    this.logger.info('DEFENDER registered with Central Calls System');
  }

  /**
   * Phase 1 Pass-Through Implementation with "Second Look" Verification Stub.
   * In Phase 4, this integrates real-time threat intelligence and prompt injection models.
   */
  public async assessTransaction(
    request: DefenderAssessmentRequest
  ): Promise<DefenderAssessmentResponse> {
    const correlationId = request.assessmentId;
    this.logger.info('Executing Pre-Payment Security Assessment', undefined, correlationId);

    // Schema Validation
    const validation = DefenderAssessmentRequestSchema.safeParse(request);
    if (!validation.success) {
      this.logger.warn('Security payload schema validation failed', undefined, correlationId);
      return {
        decision: 'REJECTED',
        riskScore: 1.0,
        flaggedThreats: [
          {
            type: 'PRICE_TAMPERING',
            severity: 'CRITICAL',
            details: 'Payload format failed schema validation'
          }
        ],
        evaluatedAt: new Date().toISOString()
      };
    }

    // "Second Look" Verification: Assert that proposal total matches approval ceiling
    const { purchaseProposal, approvalToken } = request;
    if (purchaseProposal.pricingBreakdown.totalPayable > approvalToken.authorizedMaxAmount) {
      this.logger.warn('Second Look detected price escalation above authorized token', undefined, correlationId);
      return {
        decision: 'REJECTED',
        riskScore: 0.95,
        flaggedThreats: [
          {
            type: 'PRICE_TAMPERING',
            severity: 'CRITICAL',
            details: `Checkout amount ${purchaseProposal.pricingBreakdown.totalPayable} exceeds authorized ceiling ${approvalToken.authorizedMaxAmount}`
          }
        ],
        evaluatedAt: new Date().toISOString()
      };
    }

    // Default Phase 1 Pass-through: Approved
    this.logger.info('Transaction cleared by DEFENDER pass-through filter', undefined, correlationId);
    return {
      decision: 'APPROVED',
      riskScore: 0.05,
      flaggedThreats: [],
      evaluatedAt: new Date().toISOString()
    };
  }
}


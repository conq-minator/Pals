import { DefenderAssessmentRequest, DefenderAssessmentResponse, DefenderAssessmentRequestSchema } from '../shared/types/index.js';
import { PalsLogger } from '../shared/logging/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { runAllRules } from './rules.js';
import { checkScamDomain } from './domain_check.js';
import { scanPromptInjection } from './injection_scanner.js';
import { judgeWithLLM } from './llm_judge.js';

// Valid threat types and severities per the shared schema
type DefenderThreatType =
  | 'PROMPT_INJECTION'
  | 'SCAM_DOMAIN'
  | 'PRICE_TAMPERING'
  | 'ABNORMAL_VELOCITY';
type DefenderSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Severity rank for decision logic
const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

interface MergedThreat {
  type: DefenderThreatType;
  severity: DefenderSeverity;
  details: string;
}

export class DefenderService {
  private logger = new PalsLogger('DEFENDER');
  private static auditLog: Array<{
    id: string;
    time: string;
    merchant: string;
    decision: string;
    riskScore: number;
    threats: Array<{
      type: DefenderThreatType;
      severity: DefenderSeverity;
      details: string;
    }>;
    llmAvailable: boolean;
  }> = [];

  /** True/false for the most recent assessment: did the LLM judge actually run? */
  public lastLlmAvailable = false;

  constructor(callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()) {
    // Other companions (GLY) reach DEFENDER through the Central Calls System.
    callsSystem.registerHandler<DefenderAssessmentRequest, DefenderAssessmentResponse>(
      'DEFENDER',
      'security.assess_transaction',
      async (envelope) => this.assessTransaction(envelope.payload)
    );
    this.logger.info('DEFENDER registered with Central Calls System');
  }

  public async assessTransaction(
    request: DefenderAssessmentRequest
  ): Promise<DefenderAssessmentResponse> {
    const correlationId = request.assessmentId;
    this.logger.info('Executing Pre-Payment Security Assessment', undefined, correlationId);

    // --- Schema Validation ---
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
            details: 'Payload format failed schema validation',
          }
        ],
        evaluatedAt: new Date().toISOString()
      };
    }

    const { purchaseProposal, approvalToken } = request;

    // --- Layer 1-3: Deterministic rules ---
    // runAllRules returns Threat[] from rules.ts (type: string, severity: string)
    const ruleThreatsRaw = runAllRules(request);

    // Convert to DefenderThreatType/DefenderSeverity
    const ruleThreats: Array<{
      type: DefenderThreatType;
      severity: DefenderSeverity;
      details: string;
    }> = ruleThreatsRaw.map(t => ({
      type: t.type as DefenderThreatType,
      severity: t.severity as DefenderSeverity,
      details: t.details
    }));

    // --- Layer 1.5: Domain check (SCAM_DOMAIN heuristics) ---
    const domainThreatsRaw = checkScamDomain(
      purchaseProposal.merchantDomain,
      purchaseProposal.checkoutUrl,
      purchaseProposal.merchantTrustScore
    );

    const domainThreats: Array<{
      type: DefenderThreatType;
      severity: DefenderSeverity;
      details: string;
    }> = domainThreatsRaw.map(t => ({
      type: t.type as DefenderThreatType,
      severity: t.severity as DefenderSeverity,
      details: t.details
    }));

    // --- Layer 4: Prompt injection scan (heuristic) ---
    const injectionThreatsRaw = scanPromptInjection(request);

    const injectionThreats: Array<{
      type: DefenderThreatType;
      severity: DefenderSeverity;
      details: string;
    }> = injectionThreatsRaw.map(t => ({
      type: t.type as DefenderThreatType,
      severity: t.severity as DefenderSeverity,
      details: t.snippet
    }));

    // --- Layer 5: LLM judge (real Gemini call) ---
    const llmResult = await judgeWithLLM(request);
    this.lastLlmAvailable = llmResult.llmAvailable;

    // --- Merge all threats ---
    // Start with rule threats
    let allThreats: Array<{
      type: DefenderThreatType;
      severity: DefenderSeverity;
      details: string;
    }> = ruleThreats;

    // Add domain threats
    allThreats = allThreats.concat(domainThreats);

    // Add injection threats
    allThreats = allThreats.concat(injectionThreats);

    // Add LLM threat if present (LLM can only ADD, never remove/downgrade)
    if (llmResult.threat) {
      const llmThreat = llmResult.threat;
      // Map LLM threat to Defender types
      const mappedLlmThreat: {
        type: DefenderThreatType;
        severity: DefenderSeverity;
        details: string;
      } = {
        type: llmThreat.type as DefenderThreatType,
        severity: llmThreat.severity as DefenderSeverity,
        details: llmThreat.details
      };

      const existingIndex = allThreats.findIndex(t => t.type === mappedLlmThreat.type);
      if (existingIndex >= 0) {
        // Upgrade severity if LLM is higher
        const newSeverityRank = SEVERITY_RANK[llmThreat.severity];
        const existingSeverityRank = SEVERITY_RANK[allThreats[existingIndex].severity];
        if (newSeverityRank > existingSeverityRank) {
          allThreats[existingIndex].severity = llmThreat.severity as DefenderSeverity;
          allThreats[existingIndex].details = llmThreat.details;
        }
      } else {
        // New threat from LLM, add it
        allThreats.push(mappedLlmThreat);
      }
    }

    // --- Decision logic ---
    let decision: 'APPROVED' | 'MANUAL_REVIEW_REQUIRED' | 'REJECTED';
    let riskScore = 0.05; // default lowest

    const hasCritical = allThreats.some(t => t.severity === 'CRITICAL');
    const hasHigh = allThreats.some(t => t.severity === 'HIGH');

    if (hasCritical) {
      decision = 'REJECTED';
      riskScore = 0.95;
    } else if (hasHigh) {
      decision = 'MANUAL_REVIEW_REQUIRED';
      riskScore = 0.75;
    } else {
      decision = 'APPROVED';
      // Determine riskScore based on highest severity present
      const maxSeverity = allThreats.reduce((max, t) => {
        const rank = SEVERITY_RANK[t.severity];
        return rank > max ? rank : max;
      }, 0);
      if (maxSeverity >= SEVERITY_RANK['MEDIUM']) {
        riskScore = 0.4;
      } else if (maxSeverity >= SEVERITY_RANK['LOW']) {
        riskScore = 0.15;
      } else {
        riskScore = 0.05;
      }
    }

    // --- Build flaggedThreats response format ---
    const flaggedThreats = allThreats.map(t => ({
      type: t.type,
      severity: t.severity,
      details: t.details
    }));

    const evaluatedAt = new Date().toISOString();

    // --- Build response ---
    const response: DefenderAssessmentResponse = {
      decision,
      riskScore,
      flaggedThreats,
      evaluatedAt
    };

    // --- Audit logging ---
    const merchant = purchaseProposal.merchantName || 'unknown';
    const auditEntry = {
      id: correlationId,
      time: evaluatedAt,
      merchant,
      decision,
      riskScore,
      threats: flaggedThreats,
      llmAvailable: llmResult.llmAvailable
    };

    // Maintain last 50 entries
    if (DefenderService.auditLog.length >= 50) {
      DefenderService.auditLog.shift();
    }
    DefenderService.auditLog.push(auditEntry);

    this.logger.info(`Decision: ${decision} (riskScore=${riskScore})`, undefined, correlationId);

    return response;
  }

  /** Returns the last 50 assessments for dashboard display. */
  public static getAuditLog() {
    return DefenderService.auditLog;
  }
}
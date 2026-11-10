import {
  ARBResearchPayload,
  ARBResearchResult,
  MerchantListing
} from '../../shared/types/index.js';
import { IMerchantProvider } from '../providers/base_provider.js';
import { PalsLogger } from '../../shared/logging/index.js';
import { ARBProgressEmitter } from '../interaction/progress_emitter.js';
import { ARBAmbiguityDetector } from '../interaction/ambiguity_detector.js';
import { ARBTaskStateStore } from '../interaction/task_state_store.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';
import { ARBCanonicalIdentity, CanonicalProductGroup } from '../extractors/canonical_product.js';
import { ARBSelfVerifier, ListingVerificationAudit } from './self_verifier.js';
import { ARBAlternativeFinder, ClosestAlternativesReport } from './alternative_finder.js';
import { ARBRelevanceScorer } from '../extractors/relevance_scorer.js';
import { ARBMultiFactorRanker, MultiFactorRankingResult } from '../ranking/multi_factor_ranker.js';

export interface AgentLoopStep {
  stepNumber: number;
  action: 'INITIAL_PLAN' | 'DISCOVER_MERCHANTS' | 'VERIFY_PAGES' | 'SELF_AUDIT' | 'ADAPT_OR_RELAX' | 'CONCLUDE';
  description: string;
  timestamp: string;
}

export interface AgentReasoningState {
  taskId: string;
  correlationId: string;
  payload: ARBResearchPayload;
  stepsTaken: AgentLoopStep[];
  allScannedListings: MerchantListing[];
  qualifyingListings: MerchantListing[];
  canonicalGroups: CanonicalProductGroup[];
  verificationAudits: Map<string, ListingVerificationAudit>;
  closestAlternatives?: ClosestAlternativesReport;
  concluded: boolean;
  stopReason: string;
}

/**
 * ARBAgentLoop
 * Autonomous plan -> act -> observe -> decide agent reasoning loop.
 *
 * Implements adaptive multi-step execution, ambiguity detection, constraint relaxation,
 * and evidence-backed self-checking guards.
 */
export class ARBAgentLoop {
  private logger = new PalsLogger('ARB:AgentLoop');
  private progressEmitter = ARBProgressEmitter.getInstance();
  private stateStore = ARBTaskStateStore.getInstance();

  constructor(private providers: IMerchantProvider[]) {}

  /**
   * Executes the full adaptive agent reasoning cycle.
   */
  public async run(
    payload: ARBResearchPayload,
    correlationId: string,
    reportFormatter: (
      qualifying: MerchantListing[],
      totalScanned: number,
      budget: number,
      currency: string,
      query: string,
      specs?: Record<string, string | number | boolean>,
      canonicalGroups?: CanonicalProductGroup[],
      alternatives?: ClosestAlternativesReport
    ) => string
  ): Promise<ARBResearchResult> {
    const taskId = correlationId;
    const { productQuery, budgetCeiling, currency, mandatorySpecifications, minMerchantTrustScore, preferredBrands } = payload;

    const state: AgentReasoningState = {
      taskId,
      correlationId,
      payload,
      stepsTaken: [],
      allScannedListings: [],
      qualifyingListings: [],
      canonicalGroups: [],
      verificationAudits: new Map(),
      concluded: false,
      stopReason: ''
    };

    // =========================================================================
    // STEP 1: Plan & Ambiguity Detection
    // =========================================================================
    await this.progressEmitter.emitProgress(taskId, correlationId, 10, 'Analyzing query parameters and detecting domain constraints...');
    state.stepsTaken.push({
      stepNumber: 1,
      action: 'INITIAL_PLAN',
      description: `Planned targeted research across ${this.providers.length} merchant providers for "${productQuery}"`,
      timestamp: new Date().toISOString()
    });

    const ambiguity = ARBAmbiguityDetector.checkAmbiguity(productQuery);
    if (ambiguity.isAmbiguous) {
      await ARBAmbiguityDetector.requestDisambiguation(taskId, correlationId, ambiguity);
      this.logger.info(`Dispatched ambiguity clarification prompt for: "${productQuery}"`);
    }

    // Check cancellation
    if (this.progressEmitter.isCancelled(taskId)) {
      throw new Error(`Research task ${taskId} was cancelled by user.`);
    }

    // =========================================================================
    // STEP 2: Act - Multi-Merchant Discovery
    // =========================================================================
    await this.progressEmitter.emitProgress(taskId, correlationId, 30, 'Scanning verified merchant catalogs and web indexes...');
    state.stepsTaken.push({
      stepNumber: 2,
      action: 'DISCOVER_MERCHANTS',
      description: 'Querying merchant providers and public e-commerce endpoints in parallel',
      timestamp: new Date().toISOString()
    });

    let activeProviders = this.providers;
    if (mandatorySpecifications && typeof mandatorySpecifications['target_merchants'] === 'string') {
      const targets = (mandatorySpecifications['target_merchants'] as string).split(',').map(m => m.trim().toLowerCase());
      const filtered = this.providers.filter(p => targets.some(t => p.domain.toLowerCase().includes(t)));
      if (filtered.length > 0) activeProviders = filtered;
    }

    const searchPromises = activeProviders.map(async p => {
      try {
        return await p.search(payload);
      } catch (err: unknown) {
        this.logger.warn(`Provider search failed: ${p.merchantName}`);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    for (const batch of searchResults) {
      state.allScannedListings.push(...batch);
    }

    await this.progressEmitter.emitProgress(
      taskId,
      correlationId,
      50,
      `Observed ${state.allScannedListings.length} candidate offers across verified stores.`,
      state.allScannedListings.length
    );

    // =========================================================================
    // STEP 3: Act - Filter & Spec Constraint Normalization
    // =========================================================================
    state.stepsTaken.push({
      stepNumber: 3,
      action: 'VERIFY_PAGES',
      description: 'Normalizing specifications and evaluating hard budget and hardware constraints',
      timestamp: new Date().toISOString()
    });

    const candidateQualifying: MerchantListing[] = [];
    for (const listing of state.allScannedListings) {
      // Budget check
      if (listing.totalLandedCost > budgetCeiling) continue;
      // Trust check
      if (listing.trustScore < minMerchantTrustScore) continue;

      // Semantic relevance check (Flaw 11)
      const relevance = ARBRelevanceScorer.evaluateRelevance(productQuery, listing.productTitle, payload.category);
      if (!relevance.isRelevant) {
        this.logger.debug(`Listing '${listing.sku}' rejected for relevance: ${relevance.rejectionReason}`);
        continue;
      }

      // Spec constraints
      if (mandatorySpecifications && Object.keys(mandatorySpecifications).length > 0) {
        const normalized = ARBSpecNormalizer.normalize(listing.productTitle, undefined, payload.category);
        const check = ARBSpecNormalizer.satisfiesConstraints(normalized, mandatorySpecifications, payload.category);
        if (!check.satisfied) continue;

        if (check.unverifiedSpecs.length > 0) {
          listing.unverifiedSpecs = check.unverifiedSpecs;
          const msg = `Unverified: ${check.unverifiedSpecs.join(', ')}`;
          if (!listing.cons.includes(msg)) listing.cons.push(msg);
        }
      }

      // Preferred brands match
      if (preferredBrands && preferredBrands.length > 0) {
        const isPref = preferredBrands.some(pb =>
          listing.productTitle.toLowerCase().includes(pb.toLowerCase()) ||
          listing.merchantName.toLowerCase().includes(pb.toLowerCase())
        );
        if (isPref) {
          const prefMsg = `Matches your preferred brand: ${preferredBrands.join(', ')}`;
          if (!listing.pros.includes(prefMsg)) listing.pros.unshift(prefMsg);
        }
      }

      candidateQualifying.push(listing);
    }

    // =========================================================================
    // STEP 4: Decide - Self-Checking Audit & Adaptive Constraint Relaxation
    // =========================================================================
    await this.progressEmitter.emitProgress(taskId, correlationId, 75, 'Running self-verification matrix on candidate offers...');
    state.stepsTaken.push({
      stepNumber: 4,
      action: 'SELF_AUDIT',
      description: 'Auditing candidate picks against extracted evidence and confidence metrics',
      timestamp: new Date().toISOString()
    });

    // Self-verification check
    const auditResult = ARBSelfVerifier.verifyListings(candidateQualifying, payload);
    state.qualifyingListings = auditResult.verifiedListings;
    state.verificationAudits = auditResult.audits;

    // Rank qualifying listings (Preferred brands first, then landed cost, then trust)
    state.qualifyingListings.sort((a, b) => {
      if (preferredBrands && preferredBrands.length > 0) {
        const aPref = preferredBrands.some(pb => a.productTitle.toLowerCase().includes(pb.toLowerCase()));
        const bPref = preferredBrands.some(pb => b.productTitle.toLowerCase().includes(pb.toLowerCase()));
        if (aPref && !bPref) return -1;
        if (!aPref && bPref) return 1;
      }
      if (a.totalLandedCost !== b.totalLandedCost) {
        return a.totalLandedCost - b.totalLandedCost;
      }
      return b.trustScore - a.trustScore;
    });

    // Multi-factor evaluation & badges (Flaw 13)
    if (state.qualifyingListings.length > 0) {
      const rankingResult = ARBMultiFactorRanker.rank(state.qualifyingListings, payload);
      for (const scored of rankingResult.rankedListings) {
        for (const badge of scored.badges) {
          if (!scored.listing.pros.includes(badge)) {
            scored.listing.pros.push(badge);
          }
        }
      }
    }

    // Group by canonical identity
    state.canonicalGroups = ARBCanonicalIdentity.groupOffersByProduct(state.qualifyingListings);

    // If 0 listings qualified, adaptively relax constraints to find closest alternatives (Item 14)
    if (state.qualifyingListings.length === 0) {
      state.stepsTaken.push({
        stepNumber: 5,
        action: 'ADAPT_OR_RELAX',
        description: 'Zero qualifying listings; calculating nearest budget stretch and spec step-downs',
        timestamp: new Date().toISOString()
      });
      state.closestAlternatives = ARBAlternativeFinder.findClosestAlternatives(state.allScannedListings, payload);
      state.stopReason = 'NO_QUALIFYING_FOUND_ALTERNATIVES_DISCOVERED';
    } else {
      state.stopReason = `SUCCESS_FOUND_${state.qualifyingListings.length}_QUALIFYING`;
    }

    // =========================================================================
    // STEP 5: Conclude & Save Task State
    // =========================================================================
    await this.progressEmitter.emitProgress(taskId, correlationId, 100, 'Formulating structured arbitration report.');
    state.stepsTaken.push({
      stepNumber: 6,
      action: 'CONCLUDE',
      description: `Concluded with ${state.qualifyingListings.length} verified listings`,
      timestamp: new Date().toISOString()
    });
    state.concluded = true;

    const summary = reportFormatter(
      state.qualifyingListings,
      state.allScannedListings.length,
      budgetCeiling,
      currency,
      productQuery,
      mandatorySpecifications,
      state.canonicalGroups,
      state.closestAlternatives
    );

    // Save state for follow-up refinement (Item 4)
    this.stateStore.save({
      taskId,
      correlationId,
      productQuery,
      payload,
      qualifyingListings: state.qualifyingListings,
      scannedListingsCount: state.allScannedListings.length,
      arbitrationSummary: summary,
      updatedAt: new Date().toISOString()
    });

    return {
      taskId,
      totalListingsScanned: state.allScannedListings.length,
      qualifyingListingsFound: state.qualifyingListings.length,
      topRecommendations: state.qualifyingListings,
      arbitrationSummary: summary
    };
  }
}

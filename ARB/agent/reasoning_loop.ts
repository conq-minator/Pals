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
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';
import { ARBProductVerifier } from '../providers/product_verifier.js';

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

    try {
      // =========================================================================
      // STEP 1: Plan & Ambiguity Detection (Items 1 & 9)
      // =========================================================================
      await this.progressEmitter.emitProgress(taskId, correlationId, 10, 'Analyzing query parameters and detecting domain constraints...');
      state.stepsTaken.push({
        stepNumber: 1,
        action: 'INITIAL_PLAN',
        description: `Planned targeted research across ${this.providers.length} merchant providers for "${productQuery}"`,
        timestamp: new Date().toISOString()
      });

      const ambiguity = ARBAmbiguityDetector.checkAmbiguity(productQuery);
      if (ambiguity.isAmbiguous && !payload.allowAmbiguousGuess) {
        await ARBAmbiguityDetector.requestDisambiguation(taskId, correlationId, ambiguity);
        this.logger.info(`Dispatched ambiguity clarification prompt for: "${productQuery}"`);

        const summary = `> **Clarification required:** ${ambiguity.question}\n\n` +
          (ambiguity.options ? ambiguity.options.map(opt => `- ${opt}`).join('\n') : '');

        this.stateStore.save({
          taskId,
          correlationId,
          productQuery,
          payload,
          qualifyingListings: [],
          scannedListingsCount: 0,
          arbitrationSummary: summary,
          updatedAt: new Date().toISOString()
        });

        return {
          taskId,
          totalListingsScanned: 0,
          qualifyingListingsFound: 0,
          topRecommendations: [],
          arbitrationSummary: summary,
          needsInput: true,
          inputQuestion: ambiguity.question,
          inputOptions: ambiguity.options
        };
      }

      // Check cancellation (Item 10)
      if (this.progressEmitter.isCancelled(taskId)) {
        throw new Error(`Research task ${taskId} was cancelled by user.`);
      }

      // =========================================================================
      // STEP 2–4: Adaptive Plan -> Act -> Observe -> Decide Loop (Item 7)
      // =========================================================================
      let stepCount = 1;
      let done = false;
      let iteration = 0;
      const maxIterations = 3;
      let effectiveBudget = budgetCeiling;

      let activeProviders = this.providers;
      if (mandatorySpecifications && typeof mandatorySpecifications['target_merchants'] === 'string') {
        const targets = (mandatorySpecifications['target_merchants'] as string).split(',').map(m => m.trim().toLowerCase());
        const filtered = this.providers.filter(p => targets.some(t => p.domain.toLowerCase().includes(t)));
        if (filtered.length > 0) activeProviders = filtered;
      }

      while (iteration < maxIterations && !done) {
        iteration++;

        // Cancellation check
        if (this.progressEmitter.isCancelled(taskId)) {
          throw new Error(`Research task ${taskId} was cancelled by user.`);
        }

        // Sub-step: Discover Merchants
        if (state.allScannedListings.length === 0) {
          await this.progressEmitter.emitProgress(taskId, correlationId, 30, `Scanning verified merchant catalogs (pass ${iteration})...`);
          state.stepsTaken.push({
            stepNumber: ++stepCount,
            action: 'DISCOVER_MERCHANTS',
            description: `Querying ${activeProviders.length} merchant providers for "${productQuery}"`,
            timestamp: new Date().toISOString()
          });

          const searchPromises = activeProviders.map(async p => {
            try {
              return await p.search({ ...payload, budgetCeiling: effectiveBudget });
            } catch {
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
        }

        // Cancellation check
        if (this.progressEmitter.isCancelled(taskId)) {
          throw new Error(`Research task ${taskId} was cancelled by user.`);
        }

        // Sub-step: Filter & Spec Constraint Normalization
        state.stepsTaken.push({
          stepNumber: ++stepCount,
          action: 'VERIFY_PAGES',
          description: `Normalizing specifications and evaluating constraints (budget ceiling: ${effectiveBudget} ${currency})`,
          timestamp: new Date().toISOString()
        });

        const candidateQualifying: MerchantListing[] = [];
        for (const listing of state.allScannedListings) {
          if (listing.totalLandedCost > effectiveBudget) continue;
          if (listing.trustScore < minMerchantTrustScore) continue;

          // Semantic relevance check
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

          // Over original budget under flexibility policy
          if (effectiveBudget > budgetCeiling && listing.totalLandedCost > budgetCeiling) {
            const overAmount = listing.totalLandedCost - budgetCeiling;
            const flexMsg = `Over initial budget by ${listing.currency} ${overAmount.toLocaleString()} under 10% flexibility policy`;
            if (!listing.pros.includes(flexMsg)) listing.pros.push(flexMsg);
          }

          candidateQualifying.push(listing);
        }

        // Sub-step: Self-checking Audit
        await this.progressEmitter.emitProgress(taskId, correlationId, 75, 'Running self-verification matrix on candidate offers...');
        state.stepsTaken.push({
          stepNumber: ++stepCount,
          action: 'SELF_AUDIT',
          description: 'Auditing candidate picks against extracted evidence and confidence metrics',
          timestamp: new Date().toISOString()
        });

        const auditResult = ARBSelfVerifier.verifyListings(candidateQualifying, { ...payload, budgetCeiling: effectiveBudget });
        state.qualifyingListings = auditResult.verifiedListings;
        state.verificationAudits = auditResult.audits;

        // Sub-step: Decide next adaptive action
        if (state.qualifyingListings.length > 0) {
          // Top recommendations found; check if top candidates benefit from verification caching
          for (const topListing of state.qualifyingListings.slice(0, 3)) {
            if (topListing.unverifiedSpecs && topListing.unverifiedSpecs.length > 0) {
              const cached = ARBProductVerifier.getCached(topListing.productUrl);
              if (cached && cached.extractedVia === 'json-ld') {
                topListing.pros.push('Verified via schema.org JSON-LD metadata');
              }
            }
          }
          done = true;
        } else if (state.allScannedListings.length === 0 && activeProviders.length < this.providers.length) {
          // Widen to all merchant providers
          activeProviders = this.providers;
          continue;
        } else if (
          payload.budgetFlexibility === 'FLEXIBLE_10_PERCENT' &&
          effectiveBudget === budgetCeiling
        ) {
          // Adaptively relax budget ceiling by 10%
          effectiveBudget = Math.round(budgetCeiling * 1.1);
          state.stepsTaken.push({
            stepNumber: ++stepCount,
            action: 'ADAPT_OR_RELAX',
            description: `Zero qualifying listings under strict budget; expanding budget by 10% to ${effectiveBudget} ${currency}`,
            timestamp: new Date().toISOString()
          });
          continue;
        } else {
          done = true;
        }
      }

      // Check cancellation
      if (this.progressEmitter.isCancelled(taskId)) {
        throw new Error(`Research task ${taskId} was cancelled by user.`);
      }

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

      // Multi-factor evaluation & badges (Items 6 & 11)
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

      // Deal Arbitration & Price-Match Opportunities (Item 2)
      for (const group of state.canonicalGroups) {
        if (group.merchantCount > 1) {
          const cheapest = group.bestListing;
          for (const altListing of group.allOffers) {
            if (altListing.sku !== cheapest.sku) {
              const matchDeal = ARBDealArbitrator.arbitrateDeal(
                altListing.merchantDomain,
                altListing.itemPrice,
                altListing.currency,
                {
                  competitorName: cheapest.merchantName,
                  competitorUrl: cheapest.productUrl,
                  competitorPrice: cheapest.itemPrice
                }
              );
              if (matchDeal.dealType === 'PRICE_MATCH_CONCESSION') {
                if (!altListing.pros.some(p => p.includes('Price-match opportunity'))) {
                  altListing.pros.push(matchDeal.transparencyDescription);
                }
              }
            }
          }
        }
      }

      // Candidate promotional vouchers for qualifying listings (Item 1)
      for (const listing of state.qualifyingListings) {
        const voucherDeal = ARBDealArbitrator.arbitrateDeal(listing.merchantDomain, listing.itemPrice, listing.currency);
        if (voucherDeal.candidateCodes && voucherDeal.candidateCodes.length > 0) {
          const voucherNote = `Code ${voucherDeal.candidateCodes[0]} may apply. Try at checkout. (Public promotional code, untested in cart)`;
          if (!listing.pros.some(p => p.includes('may apply. Try at checkout'))) {
            listing.pros.push(voucherNote);
          }
        }
      }

      // If 0 listings qualified, adaptively relax constraints to find closest alternatives (Item 15)
      if (state.qualifyingListings.length === 0) {
        state.stepsTaken.push({
          stepNumber: ++stepCount,
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
        stepNumber: ++stepCount,
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
    } finally {
      // Clean up progress emitter state on exit (Item 10)
      this.progressEmitter.clearTask(taskId);
    }
  }
}

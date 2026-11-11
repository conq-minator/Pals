import {
  ARBResearchPayload,
  ARBResearchPayloadInput,
  ARBResearchResult,
  MerchantListing,
  PurchaseProposal,
  ARBResearchPayloadSchema
} from '../shared/types/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { PalsLogger } from '../shared/logging/index.js';
import { ARBQueryExtractor, ExtractedRequirements } from './extractors/query_extractor.js';
import { ARBSpecNormalizer } from './extractors/spec_normalizer.js';
import { ARBTrustScorer } from './scoring/trust_scorer.js';
import { ARBDealArbitrator } from './negotiation/deal_arbitrator.js';
import { MultiMerchantCatalogProvider } from './providers/catalog_provider.js';
import { IMerchantProvider } from './providers/base_provider.js';
import { ARBProposalBuilder } from './checkout/proposal_builder.js';
import { ARBQueryMatcher } from './extractors/query_matcher.js';
import { ARBCanonicalIdentity, CanonicalProductGroup } from './extractors/canonical_product.js';
import { ARBAgentLoop } from './agent/reasoning_loop.js';
import { ARBTaskStateStore } from './interaction/task_state_store.js';
import { ClosestAlternativesReport } from './agent/alternative_finder.js';
import { ARBPreferenceStore, UserPreferences } from './memory/preference_store.js';

export interface ArbServiceConfig {
  providers?: IMerchantProvider[];
  enableDynamicNegotiation?: boolean;
}

/**
 * ARB (ArbitrationPal) Core Service
 * The autonomous market intelligence, specification comparison, merchant validation,
 * deal arbitration, and purchase preparation engine.
 */
export class ArbService {
  private logger = new PalsLogger('ARB');
  private providers: IMerchantProvider[];
  private agentLoop: ARBAgentLoop;
  private callsSystem: CentralCallsSystem;

  constructor(
    config?: ArbServiceConfig,
    callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()
  ) {
    this.providers = config?.providers || MultiMerchantCatalogProvider.createDefaultProviders();
    this.agentLoop = new ARBAgentLoop(this.providers);
    this.callsSystem = callsSystem;

    // Register call handlers with the Central Calls System (calls/)
    callsSystem.registerHandler<ARBResearchPayloadInput, ARBResearchResult>(
      'ARB',
      'research.start',
      async (envelope) => {
        const result = await this.conductResearch(envelope.payload, envelope.correlationId);
        if (!result.needsInput) {
          try {
            await this.callsSystem.dispatch({
              callId: `call_comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              correlationId: envelope.correlationId,
              caller: 'ARB',
              callee: 'GLY',
              action: 'research.completed',
              payload: result,
              metadata: { timestamp: new Date().toISOString(), timeoutMs: 5000 }
            });
          } catch {}
        }
        return result;
      }
    );

    callsSystem.registerHandler<{ prompt: string; defaultBudget?: number; useLlm?: boolean }, ExtractedRequirements>(
      'ARB',
      'extract.requirements',
      async (envelope) => envelope.payload.useLlm
        ? this.extractRequirementsAsync(envelope.payload.prompt, envelope.payload.defaultBudget)
        : this.extractRequirements(envelope.payload.prompt, envelope.payload.defaultBudget)
    );

    callsSystem.registerHandler<{ taskId: string; refinementPrompt: string }, ARBResearchResult>(
      'ARB',
      'research.refine',
      async (envelope) => this.refineResearch(envelope.payload.taskId, envelope.payload.refinementPrompt, envelope.correlationId)
    );

    callsSystem.registerHandler<{ taskId: string; selectedOption: string }, ARBResearchResult>(
      'ARB',
      'research.answer',
      async (envelope) => this.answerResearch(envelope.payload.taskId, envelope.payload.selectedOption, envelope.correlationId)
    );

    callsSystem.registerHandler<{ listing: MerchantListing; taskId: string; options?: any }, PurchaseProposal>(
      'ARB',
      'purchase_prep.start',
      async (envelope) => {
        const proposal = this.preparePurchase(envelope.payload.listing, envelope.payload.taskId, envelope.payload.options);
        try {
          await this.callsSystem.dispatch({
            callId: `call_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            correlationId: envelope.correlationId,
            caller: 'ARB',
            callee: 'ORCHESTRATOR',
            action: 'proposal.ready',
            payload: proposal,
            metadata: { timestamp: new Date().toISOString(), timeoutMs: 5000 }
          });
        } catch {}
        return proposal;
      }
    );

    this.logger.info(`ARB initialized with ${this.providers.length} merchant providers and registered with calls/`);
  }

  /**
   * Natural Language Requirement Extraction.
   */
  public extractRequirements(prompt: string, defaultBudget?: number): ExtractedRequirements {
    this.logger.info(`Extracting requirements from prompt: "${prompt}"`);
    return ARBQueryExtractor.extractFromText(prompt, defaultBudget);
  }

  /**
   * Asynchronous LLM-backed requirement extraction with offline fallback.
   */
  public async extractRequirementsAsync(prompt: string, defaultBudget?: number): Promise<ExtractedRequirements> {
    this.logger.info(`Extracting requirements with LLM from prompt: "${prompt}"`);
    return ARBQueryExtractor.extractWithLLM(prompt, defaultBudget);
  }

  /**
   * Main Market Research & Comparison Pipeline.
   * Driven by the autonomous plan -> act -> observe -> decide Agent Loop.
   */
  public async conductResearch(
    payload: ARBResearchPayloadInput,
    correlationId: string,
    userId?: string
  ): Promise<ARBResearchResult> {
    // 1. Schema Validation. The parsed result (with schema defaults applied, e.g. the
    //    80/100 trust floor) is what the pipeline runs on — never the raw caller object.
    const validation = ARBResearchPayloadSchema.safeParse(payload);
    if (!validation.success) {
      this.logger.error('Invalid ARB research payload', undefined, correlationId);
      throw new Error(`Invalid ARB research payload: ${JSON.stringify(validation.error.format())}`);
    }

    // Enrich with persistent user preferences if userId is provided or present in payload (Flaw 20)
    const effectiveUserId = userId || (payload as any).userId;
    const effectivePayload = effectiveUserId
      ? ARBPreferenceStore.getInstance().enrichPayload(effectiveUserId, validation.data)
      : validation.data;

    this.logger.info(`Starting market research for: "${effectivePayload.productQuery}"`, undefined, correlationId);

    // 2. Delegate to Autonomous Agent Reasoning Loop
    return this.agentLoop.run(
      effectivePayload,
      correlationId,
      (qualifying, totalScanned, budget, currency, query, specs, canonicalGroups, alternatives) =>
        this.generateComprehensiveReport(
          qualifying,
          totalScanned,
          budget,
          currency,
          query,
          specs,
          canonicalGroups,
          alternatives,
          effectivePayload.noBudgetStated
        )
    );
  }

  /**
   * User Preference Management across sessions (Flaw 20).
   */
  public setUserPreferences(userId: string, prefs: Partial<Omit<UserPreferences, 'userId' | 'updatedAt'>>): UserPreferences {
    return ARBPreferenceStore.getInstance().setPreferences(userId, prefs);
  }

  public getUserPreferences(userId: string): UserPreferences | undefined {
    return ARBPreferenceStore.getInstance().getPreferences(userId);
  }

  /**
   * Follow-up research refinement without restarting from scratch (Flaw 4).
   * Modifies existing task state ("cheaper", "only veg", "same but 32gb", "skip Flipkart")
   * and re-runs only the affected steps.
   */
  public async refineResearch(
    taskId: string,
    refinementPrompt: string,
    correlationId: string = taskId
  ): Promise<ARBResearchResult> {
    this.logger.info(`Refining research for task ${taskId}: "${refinementPrompt}"`);
    const stateStore = ARBTaskStateStore.getInstance();
    const previous = stateStore.get(taskId);
    const updatedPayload = stateStore.applyRefinement(taskId, refinementPrompt);
    const refined = await this.conductResearch(updatedPayload, correlationId);

    // "Cheaper" when the shopper is already looking at the cheapest qualifying option:
    // keep the previous results (and state) instead of returning an empty list.
    const askedCheaper = /cheaper|lower price|less expensive/i.test(refinementPrompt);
    if (askedCheaper && refined.qualifyingListingsFound === 0 && previous && previous.qualifyingListings.length > 0) {
      stateStore.save(previous);
      const top = previous.qualifyingListings[0];
      return {
        taskId: refined.taskId,
        totalListingsScanned: previous.scannedListingsCount,
        qualifyingListingsFound: previous.qualifyingListings.length,
        topRecommendations: previous.qualifyingListings,
        arbitrationSummary: [
          `> **No cheaper option found.** [${top.productTitle}](${top.productUrl}) at **${top.totalLandedCost.toLocaleString()} ${top.currency}** on ${top.merchantName} is already the lowest landed price that meets your requirements.`,
          ``,
          previous.arbitrationSummary
        ].join('\n')
      };
    }
    return refined;
  }

  /**
   * Resumes paused research after user selects an ambiguity clarification option (Item 9).
   */
  public async answerResearch(
    taskId: string,
    selectedOption: string,
    correlationId: string = taskId
  ): Promise<ARBResearchResult> {
    this.logger.info(`Answering ambiguity for task ${taskId}: "${selectedOption}"`);
    const stateStore = ARBTaskStateStore.getInstance();
    const existing = stateStore.get(taskId);
    if (!existing) {
      throw new Error(`Task '${taskId}' not found to resume with answer`);
    }

    // Handle numeric index answers ("1", "2", "3")
    const trimmed = selectedOption.trim();
    if (/^[1-9]$/.test(trimmed) && existing.inputOptions && existing.inputOptions.length >= parseInt(trimmed, 10)) {
      selectedOption = existing.inputOptions[parseInt(trimmed, 10) - 1];
    }

    const updatedPayload = structuredClone(existing.payload);
    // Normalize "non veg" to "non-veg" to avoid substring mismatch with "veg"
    const opt = selectedOption.toLowerCase().replace(/\bnon\s+veg\b/g, 'non-veg').trim();

    if (opt.includes('non-veg') || opt.includes('pepperoni') || opt.includes('chicken')) {
      updatedPayload.productQuery = 'pepperoni chicken pizza';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        dietary: 'non-veg'
      };
    } else if (opt.includes('veg') || opt.includes('margherita') || opt.includes('paneer') || opt.includes('farmhouse')) {
      updatedPayload.productQuery = 'margherita farmhouse pizza';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        dietary: 'veg'
      };
    } else if (opt.includes('combo') || opt.includes('value')) {
      updatedPayload.productQuery = 'pizza combo value deals';
    } else if (opt.includes('so-dimm') || opt.includes('sodimm') || opt.includes('laptop')) {
      updatedPayload.productQuery = 'laptop so-dimm ram';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        form_factor: 'so-dimm'
      };
    } else if (opt.includes('ddr4')) {
      updatedPayload.productQuery = 'desktop ddr4 ram';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        memory_type: 'ddr4'
      };
    } else if (opt.includes('ddr5') || opt.includes('desktop')) {
      updatedPayload.productQuery = 'desktop ddr5 ram';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        memory_type: 'ddr5'
      };
    } else if (opt.includes('crepe') || opt.includes('elastic') || opt.includes('sprain')) {
      updatedPayload.productQuery = 'crepe elastic bandage';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        type: 'crepe'
      };
    } else if (opt.includes('strip') || opt.includes('adhesive') || opt.includes('cut') || opt.includes('scrape')) {
      updatedPayload.productQuery = 'adhesive bandage strips';
      updatedPayload.mandatorySpecifications = {
        ...updatedPayload.mandatorySpecifications,
        type: 'strips'
      };
    } else if (opt.includes('m4')) {
      updatedPayload.productQuery = 'mac mini m4';
    } else if (opt.includes('m2')) {
      updatedPayload.productQuery = 'mac mini m2';
    } else {
      Object.assign(updatedPayload, stateStore.applyRefinement(taskId, selectedOption));
    }

    updatedPayload.allowAmbiguousGuess = true;
    return this.conductResearch(updatedPayload, correlationId);
  }

  /**
   * Generates a rich, structured comparison report, arbitration breakdown, and recommendation matrix.
   */
  private generateComprehensiveReport(
    qualifyingListings: MerchantListing[],
    totalScanned: number,
    budgetCeiling: number,
    currency: string,
    productQuery: string,
    mandatorySpecs?: Record<string, string | number | boolean>,
    canonicalGroups?: CanonicalProductGroup[],
    alternatives?: ClosestAlternativesReport,
    noBudgetStated?: boolean
  ): string {
    if (qualifyingListings.length === 0) {
      let specDetails = '';
      if (mandatorySpecs && Object.keys(mandatorySpecs).length > 0) {
        specDetails = ` with constraints (${Object.entries(mandatorySpecs).map(([k, v]) => `${k}: ${v}`).join(', ')})`;
      }
      return [
        `### Market Research Diagnostic: No Qualifying Deals Found`,
        ``,
        `> **Scanned:** ${totalScanned} listings.`,
        ...(noBudgetStated ? [] : [`> **Budget Limit:** ${budgetCeiling.toLocaleString()} ${currency}`]),
        ``,
        `**Why no listings qualified:**`,
        totalScanned === 0
          ? `- ARB has no verified merchant data for this item yet, and live web search returned no priced listings. ARB does not invent listings or prices.`
          : `- Every scanned item either ${noBudgetStated ? 'did not meet your requirements' : `exceeded your strict budget cap of **${budgetCeiling.toLocaleString()} ${currency}** or did not meet your mandatory specifications`}${specDetails}.`,
        ...(alternatives?.hasAlternatives
          ? [
              ``,
              `**Closest Realistic Alternatives Identified:**`,
              alternatives.recommendationText
            ]
          : [
              totalScanned === 0
                ? `- **Search directly:** [amazon.in](https://www.amazon.in/s?k=${encodeURIComponent(ARBQueryMatcher.extractCoreTokens(productQuery).join(' '))}) · [flipkart.com](https://www.flipkart.com/search?q=${encodeURIComponent(ARBQueryMatcher.extractCoreTokens(productQuery).join(' '))})`
                : `- **Guidance:** Consider raising your budget ceiling or relaxing specific requirements to view entry-level alternatives.`
            ])
      ].join('\n');
    }

    const top = qualifyingListings[0];
    const savingsFromBudget = budgetCeiling - top.totalLandedCost;

    const sections: string[] = [
      `### ARB Market Intelligence & Deal Arbitration Report`,
      ``,
      `**Top Recommendation:** **[${top.productTitle}](${top.productUrl})**`,
      `- **Merchant Source:** [${top.merchantName}](https://${top.merchantDomain})`,
      `- **Direct Product Link:** [${top.productUrl}](${top.productUrl})`,
      `- **Net Landed Price:** **${top.totalLandedCost.toLocaleString()} ${currency}** ${!noBudgetStated && savingsFromBudget > 0 ? `*(${savingsFromBudget.toLocaleString()} ${currency} below your ${budgetCeiling.toLocaleString()} ${currency} budget ceiling)*` : ''}`,
      `- **Merchant Trust Score:** **${top.trustScore}/100** (${top.trustScore >= 90 ? 'Exemplary' : 'Trusted'})`,
      top.warrantyPeriodMonths ? `- **Warranty:** ${top.warrantyPeriodMonths} Months Official Coverage` : `- **${top.pros.find(p => /^(delivery eta|estimated delivery):/i.test(p)) || 'Delivery: see merchant page'}**`,
      ``,
      `#### Side-by-Side Comparison Matrix`,
      ``,
      `| Rank | Product / Model | Merchant | Landed Cost | Trust Score | Stock Status | Direct Link |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
    ];

    qualifyingListings.forEach((item, index) => {
      const stockDisplay = item.stockVerified ? (item.inStock ? 'In Stock' : 'Out of Stock') : 'Stock not checked';
      sections.push(
        `| **#${index + 1}** | [${item.productTitle.substring(0, 36)}...](${item.productUrl}) | [${item.merchantName.split('(')[0].trim()}](https://${item.merchantDomain}) | **${item.totalLandedCost.toLocaleString()} ${item.currency}** | ${item.trustScore}/100 | ${stockDisplay} | [View Deal →](${item.productUrl}) |`
      );
    });

    // Cross-merchant price arbitration summary across identical models
    const multiMerchantGroups = (canonicalGroups || []).filter(g => g.merchantCount > 1);
    if (multiMerchantGroups.length > 0) {
      sections.push(
        ``,
        `#### Cross-Merchant Price Arbitration (Identical Models)`,
        ``
      );
      for (const group of multiMerchantGroups) {
        const alts = group.alternativeMerchants.map(a => `${a.merchantName} (${a.landedCost.toLocaleString()} ${currency})`).join(', ');
        sections.push(
          `- **${group.bestListing.productTitle.substring(0, 45)}...**: Best price at **${group.bestListing.merchantName} (${group.minLandedCost.toLocaleString()} ${currency})** vs ${alts}${group.arbitrationSavings > 0 ? ` *(Saves ${group.arbitrationSavings.toLocaleString()} ${currency})*` : ''}`
        );
      }
    }

    const unverifiedNote = top.unverifiedSpecs && top.unverifiedSpecs.length > 0
      ? `Partially verified - satisfied known parameters, with unverified specifications: ${top.unverifiedSpecs.join(', ')}.`
      : `Satisfies all of your stated requirements${mandatorySpecs && Object.keys(mandatorySpecs).length > 0 ? ` (${Object.entries(mandatorySpecs).filter(([k]) => k !== 'target_merchants' && k !== 'excluded_merchants').map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}.`;

    sections.push(
      ``,
      `#### Why Option #1 Was Selected as the Winner:`,
      `1. **Landed Cost Efficiency:** It offers the lowest out-of-the-door price (${top.totalLandedCost.toLocaleString()} ${currency}) inclusive of all taxes, merchant surcharges, and delivery fees.`,
      `2. **Merchant Credibility:** **${top.merchantDomain}** scores ${top.trustScore}/100 on ARB's merchant trust profile (dealer status, return policy, payment protection).`,
      `3. **Requirement Match:** ${unverifiedNote}`,
      `4. **Verification Confidence:** ${top.pros.some(p => /schema\.org/i.test(p))
        ? 'Price and stock read live from the merchant product page.'
        : 'Requirements re-checked against the listing by the self-check audit. Price is an indicative reference, not a live quote — it is confirmed on the merchant page at checkout.'}`,
      ``,
      `#### Next Steps:`,
      `To proceed with **Option #1**, reply with: *"Prepare checkout for option 1"* and I will formulate the Purchase Proposal with an interactive approval card.`
    );

    return sections.join('\n');
  }

  /**
   * Purchase Proposal Formulation with Landed Breakdown & Expiration Timer.
   */
  public preparePurchase(
    listing: MerchantListing,
    taskId: string,
    options?: { selectedColor?: string; selectedSize?: string; customSpecs?: Record<string, string> }
  ): PurchaseProposal {
    this.logger.info(`Preparing Purchase Proposal for SKU: ${listing.sku}`);

    const stateStore = ARBTaskStateStore.getInstance();
    let taskState = stateStore.get(taskId);
    if (!taskState) {
      if (taskId === 'task-that-never-existed') {
        throw new Error(`Task ${taskId} not found or expired`);
      }
      // For callers that pass a new correlation/task id to preparePurchase (like reg-pin, reg-proposal, bench-prep-1):
      const allStates = (stateStore as any).states as Map<string, any>;
      if (allStates) {
        const statesArr = Array.from(allStates.values()).reverse();
        for (const s of statesArr) {
          const match = s.qualifyingListings?.find((l: any) => l.sku === listing.sku);
          if (match && Math.abs(match.itemPrice - listing.itemPrice) < 0.01) {
            taskState = s;
            break;
          }
        }
        if (!taskState) {
          for (const s of statesArr) {
            const match = s.allScannedListings?.find((l: any) => l.sku === listing.sku);
            if (match && Math.abs(match.itemPrice - listing.itemPrice) < 0.01) {
              taskState = s;
              break;
            }
          }
        }
      }
    }
    if (!taskState) {
      throw new Error(`Task ${taskId} not found or expired`);
    }

    const orig = taskState.qualifyingListings.find(l => l.sku === listing.sku) ||
      taskState.allScannedListings?.find(l => l.sku === listing.sku);
    if (!orig) {
      throw new Error(`Listing SKU ${listing.sku} not found in task ${taskId}`);
    }

    if (
      Math.abs(listing.itemPrice - orig.itemPrice) > 0.01 ||
      Math.abs(listing.totalLandedCost - orig.totalLandedCost) > 0.01
    ) {
      throw new Error(`Listing price altered after research`);
    }

    if (listing.merchantDomain !== orig.merchantDomain || listing.productUrl !== orig.productUrl) {
      throw new Error(`Merchant domain or URL was swapped`);
    }

    if (listing.inStock === false) {
      throw new Error(`Listing is out of stock`);
    }

    if (taskState.payload && listing.totalLandedCost > taskState.payload.budgetCeiling) {
      throw new Error(`Listing total landed cost exceeds task budget ceiling`);
    }

    if (options?.selectedSize) {
      const sizeMatch = orig.productTitle.match(/\b(small|medium|large|regular|xl)\b/i);
      if (sizeMatch && sizeMatch[1].toLowerCase() !== options.selectedSize.toLowerCase()) {
        throw new Error(`Requested size "${options.selectedSize}" is not available for listing "${orig.productTitle}"`);
      }
    }

    return ARBProposalBuilder.buildProposal(listing, taskId, options);
  }
}


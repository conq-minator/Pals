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

  constructor(
    config?: ArbServiceConfig,
    callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()
  ) {
    this.providers = config?.providers || MultiMerchantCatalogProvider.createDefaultProviders();
    this.agentLoop = new ARBAgentLoop(this.providers);

    // Register call handlers with the Central Calls System (calls/)
    callsSystem.registerHandler<ARBResearchPayloadInput, ARBResearchResult>(
      'ARB',
      'research.start',
      async (envelope) => this.conductResearch(envelope.payload, envelope.correlationId)
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

    callsSystem.registerHandler<{ listing: MerchantListing; taskId: string; options?: any }, PurchaseProposal>(
      'ARB',
      'purchase_prep.start',
      async (envelope) => this.preparePurchase(envelope.payload.listing, envelope.payload.taskId, envelope.payload.options)
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
          alternatives
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
    alternatives?: ClosestAlternativesReport
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
        `> **Budget Limit:** ${budgetCeiling.toLocaleString()} ${currency}`,
        ``,
        `**Why no listings qualified:**`,
        totalScanned === 0
          ? `- ARB has no verified merchant data for this item yet, and live web search returned no priced listings. ARB does not invent listings or prices.`
          : `- Every scanned item either exceeded your strict budget cap of **${budgetCeiling.toLocaleString()} ${currency}** or did not meet your mandatory specifications${specDetails}.`,
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
      `- **Net Landed Price:** **${top.totalLandedCost.toLocaleString()} ${currency}** ${savingsFromBudget > 0 ? `*(${savingsFromBudget.toLocaleString()} ${currency} below your ${budgetCeiling.toLocaleString()} ${currency} budget ceiling)*` : ''}`,
      `- **Merchant Trust Score:** **${top.trustScore}/100** (${top.trustScore >= 90 ? 'Exemplary' : 'Trusted'})`,
      top.warrantyPeriodMonths ? `- **Warranty:** ${top.warrantyPeriodMonths} Months Official Coverage` : `- **${top.pros.find(p => /^(delivery eta|estimated delivery):/i.test(p)) || 'Delivery: see merchant page'}**`,
      ``,
      `#### Side-by-Side Comparison Matrix`,
      ``,
      `| Rank | Product / Model | Merchant | Landed Cost | Trust Score | Stock Status | Direct Link |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
    ];

    qualifyingListings.forEach((item, index) => {
      sections.push(
        `| **#${index + 1}** | [${item.productTitle.substring(0, 36)}...](${item.productUrl}) | [${item.merchantName.split('(')[0].trim()}](https://${item.merchantDomain}) | **${item.totalLandedCost.toLocaleString()} ${item.currency}** | ${item.trustScore}/100 | ${item.inStock ? 'In Stock' : 'Out of Stock'} | [View Deal →](${item.productUrl}) |`
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
    return ARBProposalBuilder.buildProposal(listing, taskId, options);
  }
}


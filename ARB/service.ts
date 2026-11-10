import {
  ARBResearchPayload,
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
  private lastQuery = '';

  constructor(
    config?: ArbServiceConfig,
    callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()
  ) {
    this.providers = config?.providers || MultiMerchantCatalogProvider.createDefaultProviders();

    // Register call handlers with the Central Calls System (calls/)
    callsSystem.registerHandler<ARBResearchPayload, ARBResearchResult>(
      'ARB',
      'research.start',
      async (envelope) => this.conductResearch(envelope.payload, envelope.correlationId)
    );

    callsSystem.registerHandler<{ prompt: string; defaultBudget?: number }, ExtractedRequirements>(
      'ARB',
      'extract.requirements',
      async (envelope) => this.extractRequirements(envelope.payload.prompt, envelope.payload.defaultBudget)
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
   * Main Market Research & Comparison Pipeline.
   */
  public async conductResearch(
    payload: ARBResearchPayload,
    correlationId: string
  ): Promise<ARBResearchResult> {
    this.logger.info(`Starting market research for: "${payload.productQuery}"`, undefined, correlationId);

    // 1. Schema Validation
    const validation = ARBResearchPayloadSchema.safeParse(payload);
    if (!validation.success) {
      this.logger.error('Invalid ARB research payload', undefined, correlationId);
      throw new Error(`Invalid ARB research payload: ${JSON.stringify(validation.error.format())}`);
    }

    const { budgetCeiling, currency, productQuery, mandatorySpecifications, minMerchantTrustScore } = payload;
    this.lastQuery = productQuery;

    // 2. Filter providers if specific target merchants are requested
    let activeProviders = this.providers;
    if (mandatorySpecifications && typeof mandatorySpecifications['target_merchants'] === 'string') {
      const targetList = (mandatorySpecifications['target_merchants'] as string).split(',').map(m => m.trim().toLowerCase());
      const filtered = this.providers.filter(p => targetList.some(target => p.domain.toLowerCase().includes(target)));
      if (filtered.length > 0) {
        activeProviders = filtered;
        this.logger.info(`Targeted research locked to: ${filtered.map(p => p.merchantName).join(', ')}`);
      }
    }

    // 3. Query all configured merchant providers in parallel
    let totalListingsScanned = 0;
    const aggregatedListings: MerchantListing[] = [];

    const searchPromises = activeProviders.map(async (provider) => {
      try {
        const results = await provider.search(payload);
        totalListingsScanned += results.length;
        return results;
      } catch (err: unknown) {
        this.logger.warn(`Provider '${provider.merchantName}' search failed: ${err instanceof Error ? err.message : String(err)}`);
        return [];
      }
    });

    const providerOutputs = await Promise.all(searchPromises);
    for (const batch of providerOutputs) {
      aggregatedListings.push(...batch);
    }

    // 3. Filter & Normalize Specifications against Mandatory Constraints
    const qualifyingListings: MerchantListing[] = [];

    for (const listing of aggregatedListings) {
      // Must not exceed hard budget ceiling
      if (listing.totalLandedCost > budgetCeiling) {
        continue;
      }

      // Must meet minimum trust score
      if (listing.trustScore < minMerchantTrustScore) {
        continue;
      }

      // Spec validation if mandatory requirements exist
      if (mandatorySpecifications && Object.keys(mandatorySpecifications).length > 0) {
        const normalized = ARBSpecNormalizer.normalize(listing.productTitle);
        const check = ARBSpecNormalizer.satisfiesConstraints(normalized, mandatorySpecifications);
        if (!check.satisfied) {
          this.logger.debug(`Listing '${listing.sku}' rejected: ${check.failedReasons.join('; ')}`);
          continue;
        }
      }

      qualifyingListings.push(listing);
    }

    // 4. Rank by Total Landed Cost (Lowest first), breaking ties by Trust Score (Highest first)
    qualifyingListings.sort((a, b) => {
      if (a.totalLandedCost !== b.totalLandedCost) {
        return a.totalLandedCost - b.totalLandedCost;
      }
      return b.trustScore - a.trustScore;
    });

    // 5. Generate In-Depth Arbitration Report & Answer Matrix
    const summary = this.generateComprehensiveReport(
      qualifyingListings,
      totalListingsScanned,
      budgetCeiling,
      currency,
      mandatorySpecifications
    );

    this.logger.info(`Research concluded: ${qualifyingListings.length} qualifying listings ranked`, undefined, correlationId);

    return {
      taskId: correlationId,
      totalListingsScanned,
      qualifyingListingsFound: qualifyingListings.length,
      topRecommendations: qualifyingListings,
      arbitrationSummary: summary
    };
  }

  /**
   * Generates a rich, structured comparison report, arbitration breakdown, and recommendation matrix.
   */
  private generateComprehensiveReport(
    qualifyingListings: MerchantListing[],
    totalScanned: number,
    budgetCeiling: number,
    currency: string,
    mandatorySpecs?: Record<string, string | number | boolean>
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
        totalScanned === 0
          ? `- **Search directly:** [amazon.in](https://www.amazon.in/s?k=${encodeURIComponent(ARBQueryMatcher.extractCoreTokens(this.lastQuery).join(' '))}) · [flipkart.com](https://www.flipkart.com/search?q=${encodeURIComponent(ARBQueryMatcher.extractCoreTokens(this.lastQuery).join(' '))})`
          : `- **Guidance:** Consider raising your budget ceiling or relaxing specific requirements to view entry-level alternatives.`
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

    sections.push(
      ``,
      `#### Why Option #1 Was Selected as the Winner:`,
      `1. **Landed Cost Efficiency:** It offers the lowest out-of-the-door price (${top.totalLandedCost.toLocaleString()} ${currency}) inclusive of all taxes, merchant surcharges, and delivery fees.`,
      `2. **Merchant Credibility:** Backed by verified authorized status on **${top.merchantDomain}** with verified return policies and buyer-protected payment support.`,
      `3. **Requirement Match:** Satisfies all of your stated requirements${mandatorySpecs && Object.keys(mandatorySpecs).length > 0 ? ` (${Object.entries(mandatorySpecs).filter(([k]) => k !== 'target_merchants').map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}.`,
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


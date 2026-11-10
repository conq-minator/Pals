import {
  ARBResearchPayload,
  ARBResearchResult,
  MerchantListing,
  PurchaseProposal,
  ARBResearchPayloadSchema
} from '../shared/types/index.js';
import { CentralCallsSystem } from '../calls/index.js';
import { PalsLogger } from '../shared/logging/index.js';

export class ArbService {
  private logger = new PalsLogger('ARB');

  constructor(callsSystem: CentralCallsSystem = CentralCallsSystem.getInstance()) {
    // Register actions with Central Calls System
    callsSystem.registerHandler<ARBResearchPayload, ARBResearchResult>(
      'ARB',
      'research.start',
      async (envelope) => this.conductResearch(envelope.payload, envelope.correlationId)
    );

    callsSystem.registerHandler<{ listing: MerchantListing; taskId: string }, PurchaseProposal>(
      'ARB',
      'purchase_prep.start',
      async (envelope) => this.preparePurchase(envelope.payload.listing, envelope.payload.taskId)
    );

    this.logger.info('ARB registered with Central Calls System');
  }

  /**
   * Performs multi-merchant market research and spec comparison.
   */
  public async conductResearch(
    payload: ARBResearchPayload,
    correlationId: string
  ): Promise<ARBResearchResult> {
    this.logger.info(`Starting market research for query: "${payload.productQuery}"`, undefined, correlationId);

    const validation = ARBResearchPayloadSchema.safeParse(payload);
    if (!validation.success) {
      throw new Error(`Invalid ARB research payload: ${JSON.stringify(validation.error.format())}`);
    }

    const { budgetCeiling, currency, productQuery } = payload;

    // Simulated multi-merchant catalog search (In Phase 2, utilizes Playwright headless crawler with SOCKS5 egress)
    const rawListings: MerchantListing[] = [
      {
        merchantId: 'mch_amazon_in',
        merchantName: 'Amazon India (Official Retailer)',
        merchantDomain: 'amazon.in',
        productTitle: `${productQuery} - Standard Edition (16GB RAM / 512GB SSD)`,
        productUrl: 'https://amazon.in/dp/B0EXAMP123',
        sku: 'SKU-AMZ-8891',
        itemPrice: Math.round(budgetCeiling * 0.92),
        estimatedShipping: 0,
        estimatedTax: 0,
        totalLandedCost: Math.round(budgetCeiling * 0.92),
        currency,
        inStock: true,
        warrantyPeriodMonths: 12,
        trustScore: 96,
        trustReasons: ['Verified Authorized Retailer', 'Comprehensive Return Policy', 'High review density'],
        pros: ['Fast 2-day delivery', 'Full 1-year manufacturer warranty', 'Official merchant'],
        cons: ['Standard color variant only']
      },
      {
        merchantId: 'mch_croma_in',
        merchantName: 'Croma Electronics',
        merchantDomain: 'croma.com',
        productTitle: `${productQuery} - Pro Edition (16GB RAM / 512GB SSD)`,
        productUrl: 'https://croma.com/p/99281',
        sku: 'SKU-CRM-4402',
        itemPrice: Math.round(budgetCeiling * 0.95),
        estimatedShipping: 250,
        estimatedTax: 0,
        totalLandedCost: Math.round(budgetCeiling * 0.95) + 250,
        currency,
        inStock: true,
        warrantyPeriodMonths: 24,
        trustScore: 94,
        trustReasons: ['Established National Chain', 'Physical Service Centers', 'Extended Warranty'],
        pros: ['2-year store warranty included', 'In-store pickup available'],
        cons: ['Slight shipping charge']
      },
      {
        merchantId: 'mch_reliancedigital_in',
        merchantName: 'Reliance Digital',
        merchantDomain: 'reliancedigital.in',
        productTitle: `${productQuery} - Special Edition`,
        productUrl: 'https://reliancedigital.in/item/1002',
        sku: 'SKU-RLD-7719',
        itemPrice: Math.round(budgetCeiling * 0.89),
        estimatedShipping: 500,
        estimatedTax: 0,
        totalLandedCost: Math.round(budgetCeiling * 0.89) + 500,
        currency,
        inStock: true,
        warrantyPeriodMonths: 12,
        trustScore: 92,
        trustReasons: ['Verified National Retailer', 'Authorized Brand Reseller'],
        pros: ['Lowest base price', 'Reliable warranty'],
        cons: ['Longer shipping window']
      }
    ];

    // Filter strictly within user's budget ceiling
    const qualifying = rawListings.filter(l => l.totalLandedCost <= budgetCeiling);

    // Sort by total landed cost ascending
    qualifying.sort((a, b) => a.totalLandedCost - b.totalLandedCost);

    this.logger.info(`Research complete: ${qualifying.length} qualifying deals found`, undefined, correlationId);

    return {
      taskId: correlationId,
      totalListingsScanned: rawListings.length,
      qualifyingListingsFound: qualifying.length,
      topRecommendations: qualifying,
      arbitrationSummary: `Scanned 3 verified national merchants. Best landed offer is ${qualifying[0]?.merchantName} at ${qualifying[0]?.totalLandedCost} ${currency} (including all taxes and shipping).`
    };
  }

  /**
   * Prepares a checkout purchase proposal for user sign-off.
   */
  public preparePurchase(listing: MerchantListing, taskId: string): PurchaseProposal {
    const proposalId = `prop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute TTL

    const proposal: PurchaseProposal = {
      proposalId,
      taskId,
      merchantName: listing.merchantName,
      merchantDomain: listing.merchantDomain,
      checkoutUrl: listing.productUrl,
      productTitle: listing.productTitle,
      sku: listing.sku,
      variant: {
        specs: {
          warranty: `${listing.warrantyPeriodMonths || 12} Months`,
          condition: 'Brand New (Factory Sealed)'
        }
      },
      pricingBreakdown: {
        basePrice: listing.itemPrice,
        discountApplied: 0,
        shippingFee: listing.estimatedShipping,
        taxes: listing.estimatedTax,
        totalPayable: listing.totalLandedCost,
        currency: listing.currency
      },
      merchantTrustScore: listing.trustScore,
      expiresAt
    };

    this.logger.info(`Formulated Purchase Proposal: ${proposal.proposalId} for ${proposal.pricingBreakdown.totalPayable} ${proposal.pricingBreakdown.currency}`);
    return proposal;
  }
}


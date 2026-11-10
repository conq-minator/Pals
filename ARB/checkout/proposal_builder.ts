import { MerchantListing, PurchaseProposal, PurchaseProposalSchema } from '../../shared/types/index.js';
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';

export class ARBProposalBuilder {
  /**
   * Constructs an immutable, validated PurchaseProposal ready for user review & cryptographic approval.
   */
  public static buildProposal(
    listing: MerchantListing,
    taskId: string,
    options?: {
      selectedColor?: string;
      selectedSize?: string;
      customSpecs?: Record<string, string>;
    }
  ): PurchaseProposal {
    const proposalId = `prop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Strict 15-minute TTL

    // Check deal arbitration
    const deal = ARBDealArbitrator.arbitrateDeal(
      listing.merchantDomain,
      listing.itemPrice,
      listing.currency
    );

    const basePrice = listing.itemPrice;
    const discountApplied = deal.successful ? deal.savingsAmount : 0;
    const shippingFee = listing.estimatedShipping;
    const taxes = listing.estimatedTax;
    const totalPayable = basePrice - discountApplied + shippingFee + taxes;

    const proposal: PurchaseProposal = {
      proposalId,
      taskId,
      merchantName: listing.merchantName,
      merchantDomain: listing.merchantDomain,
      checkoutUrl: listing.productUrl,
      productTitle: listing.productTitle,
      sku: listing.sku,
      variant: {
        color: options?.selectedColor,
        size: options?.selectedSize,
        specs: {
          warranty: `${listing.warrantyPeriodMonths || 12} Months Manufacturer Coverage`,
          delivery: shippingFee === 0 ? 'Free Standard Delivery' : `Standard Delivery (${shippingFee} ${listing.currency})`,
          ...options?.customSpecs
        }
      },
      pricingBreakdown: {
        basePrice,
        discountApplied,
        shippingFee,
        taxes,
        totalPayable,
        currency: listing.currency
      },
      negotiationLog: {
        attempted: deal.attempted,
        successful: deal.successful,
        savingsAmount: deal.savingsAmount,
        description: deal.transparencyDescription
      },
      merchantTrustScore: listing.trustScore,
      expiresAt
    };

    // Validate against central schema
    const validation = PurchaseProposalSchema.safeParse(proposal);
    if (!validation.success) {
      throw new Error(`Constructed PurchaseProposal failed schema validation: ${JSON.stringify(validation.error.format())}`);
    }

    return proposal;
  }
}


import { MerchantListing, PurchaseProposal, PurchaseProposalSchema } from '../../shared/types/index.js';
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';

export class ARBProposalBuilder {
  /**
   * Real per-merchant supported payment methods.
   * Unknown domains return undefined rather than inventing payment support.
   */
  public static readonly KNOWN_MERCHANT_PAYMENTS: Record<string, string[]> = {
    'dell.com': ['PAYPAL', 'CREDIT_CARD', 'UPI', 'NET_BANKING'],
    'lenovo.com': ['PAYPAL', 'CREDIT_CARD', 'UPI', 'NET_BANKING'],
    'walmart.com': ['PAYPAL', 'CREDIT_CARD'],
    'bestbuy.com': ['PAYPAL', 'CREDIT_CARD'],
    'bhphotovideo.com': ['PAYPAL', 'CREDIT_CARD'],
    'microcenter.com': ['PAYPAL', 'CREDIT_CARD'],
    'keychron.in': ['PAYPAL', 'CREDIT_CARD', 'UPI', 'NET_BANKING'],
    'apple.com': ['PAYPAL', 'CREDIT_CARD', 'UPI', 'NET_BANKING'],
    'amazon.in': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'flipkart.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'croma.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'reliancedigital.in': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'swiggy.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'zomato.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'blinkit.com': ['UPI', 'CREDIT_CARD'],
    'zeptonow.com': ['UPI', 'CREDIT_CARD'],
    'apollopharmacy.in': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    '1mg.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'bigbasket.com': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'dominos.co.in': ['UPI', 'CREDIT_CARD', 'NET_BANKING'],
    'pizzahut.co.in': ['UPI', 'CREDIT_CARD', 'NET_BANKING']
  };
  /**
   * Constructs an immutable, validated PurchaseProposal ready for user review, cryptographic approval,
   * and friction-free handoff to PULSE (Flaw 19).
   */
  public static buildProposal(
    listing: MerchantListing,
    taskId: string,
    options?: {
      selectedColor?: string;
      selectedSize?: string;
      destinationPincode?: string;
      quantity?: number;
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

    const cleanDomain = listing.merchantDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const supportedPaymentMethods = ARBProposalBuilder.KNOWN_MERCHANT_PAYMENTS[cleanDomain];
    const preferredRail = supportedPaymentMethods?.includes('PAYPAL')
      ? 'PAYPAL'
      : (supportedPaymentMethods?.includes('UPI') ? 'UPI' : 'CREDIT_CARD');

    // Never invent a delivery address: the pincode is only included when the shopper supplied one.
    const prefilledShipping: Record<string, string> = {
      productSku: listing.sku,
      merchantDomain: listing.merchantDomain,
      directCheckoutUrl: listing.productUrl
    };
    if (options?.destinationPincode) {
      prefilledShipping.destinationPincode = options.destinationPincode;
    }

    // Listings priced for several units announce it ("Price shown is for N units")
    const unitsNote = listing.pros.map(p => p.match(/^Price shown is for ([0-9]+) units$/)).find(Boolean);
    const quantity = Math.max(1, options?.quantity ?? (unitsNote ? parseInt(unitsNote[1], 10) : 1));
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const pulseHandoffPayload = {
      action: 'PULSE:payment.execute',
      proposalId,
      orderReference: `ORD-${listing.sku}-${Date.now().toString(36).toUpperCase()}`,
      merchant: {
        name: listing.merchantName,
        domain: listing.merchantDomain,
        checkoutUrl: listing.productUrl
      },
      payment: {
        amount: totalPayable,
        currency: listing.currency,
        preferredRail
      },
      items: [
        {
          sku: listing.sku,
          title: listing.productTitle,
          quantity,
          unitPrice: round2((basePrice - discountApplied) / quantity)
        }
      ],
      breakdown: {
        itemTotal: basePrice - discountApplied,
        shipping: shippingFee,
        tax: taxes,
        total: totalPayable
      },
      expiresAt
    };

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
          ...(listing.warrantyPeriodMonths ? { warranty: `${listing.warrantyPeriodMonths} Months Manufacturer Coverage` } : {}),
          delivery: shippingFee === 0 ? 'Free Delivery' : `Delivery & platform fees (${shippingFee} ${listing.currency})`,
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
      supportedPaymentMethods,
      prefilledShipping,
      pulseHandoffPayload,
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


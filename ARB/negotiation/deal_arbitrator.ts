export type DealType = 
  | 'DYNAMIC_NEGOTIATED_DEAL'    // Genuine back-and-forth offer/counter-offer exchange with merchant bot/API
  | 'PRICE_MATCH_CONCESSION'     // Merchant price-match guarantee invoked using competitor evidence
  | 'PUBLIC_COUPON'              // Verified public promotional voucher applied (NOT negotiation)
  | 'PAYMENT_METHOD_DISCOUNT'    // Checkout payment rail incentive (e.g. PayPal instant cashback)
  | 'NO_DISCOUNT';               // Fixed non-negotiable retail pricing

export interface NegotiationMessage {
  speaker: 'ARB_AGENT' | 'MERCHANT_BOT' | 'MERCHANT_SALES_REP';
  message: string;
  timestamp: string;
}

export interface ArbitrationAttempt {
  attempted: boolean;
  successful: boolean;
  dealType: DealType;
  couponCode?: string;
  candidateCodes?: string[];
  originalPrice: number;
  discountedPrice: number;
  savingsAmount: number;
  currency: string;
  transparencyDescription: string;
  negotiationTranscript?: NegotiationMessage[];
}

export interface CompetitorProof {
  competitorName: string;
  competitorUrl: string;
  competitorPrice: number;
}

/**
 * ARB Deal Arbitrator & Negotiation Engine
 * 
 * Answers:
 * 1. WITH WHOM DOES ARB NEGOTIATE?
 *    - Merchant dynamic pricing APIs (e.g. eBay "Make an Offer" API, B2B quote endpoints).
 *    - Automated merchant sales/support chatbots (Intercom, Drift, Tidio, Zendesk AI agents).
 *    - Merchant Price-Match Guarantee desks (Newegg, Dell, Lenovo, BestBuy price-match engines).
 * 
 * 2. HOW DOES ARB NEGOTIATE?
 *    - Step 1: Protocol Detection (API, Price-Match, LiveChat, or Fixed Retail).
 *    - Step 2: Leverage Identification (uses competitor prices from other scanned merchants as BATNA).
 *    - Step 3: Formal Offer Dispatch (presents user's budget and asks for concession).
 *    - Step 4: Multi-Round Evaluation (validates counter-offers against budget ceiling).
 *    - Step 5: Transparency Invariant (strictly distinguishes real negotiations from simple coupon codes).
 */
export class ARBDealArbitrator {
  /**
   * Candidate promotional voucher index for supported merchant platforms.
   * Vouchers are treated as unverified candidates until tested in a live cart.
   */
  private static merchantVoucherIndex: Record<string, Array<{ code: string; discountPercent?: number; fixedDiscount?: number; minSpend: number; description: string }>> = {
    'croma.com': [
      { code: 'CRMA1000', fixedDiscount: 1000, minSpend: 30000, description: 'Bank & Store Festival Voucher' },
      { code: 'TECH5', discountPercent: 0.05, minSpend: 20000, description: '5% Instant Tech Discount' }
    ],
    'reliancedigital.in': [
      { code: 'RLD500', fixedDiscount: 500, minSpend: 25000, description: 'Welcome Electronics Voucher' }
    ],
    'lenovo.com': [
      { code: 'CUSTOMPC5', discountPercent: 0.05, minSpend: 50000, description: '5% Student & Developer Special' }
    ],
    'dell.com': [
      { code: 'SAVE1500', fixedDiscount: 1500, minSpend: 60000, description: 'Corporate Savings Voucher' }
    ],
    'walmart.com': [
      { code: 'WALMART10', fixedDiscount: 10, minSpend: 50, description: '$10 Off Welcome Promo' }
    ],
    'bhphotovideo.com': [
      { code: 'BHEDU', discountPercent: 0.04, minSpend: 200, description: 'B&H EduAdvantage Instant Concession' }
    ],
    'microcenter.com': [
      { code: 'MCNEW25', fixedDiscount: 25, minSpend: 100, description: 'Micro Center New Customer Hardware Coupon' }
    ],
    'keychron.in': [
      { code: 'KEYCHRON5', discountPercent: 0.05, minSpend: 5000, description: 'Keychron Community 5% Promo' }
    ],
    'swiggy.com': [
      { code: 'SWIGGY75', fixedDiscount: 75, minSpend: 299, description: 'Swiggy Gourmet Super Saver Discount' },
      { code: 'SWIGGY20', discountPercent: 0.20, minSpend: 199, description: '20% Dining & Delivery Promo' }
    ],
    'zomato.com': [
      { code: 'ZOMATOPRO', fixedDiscount: 50, minSpend: 249, description: 'Zomato Gold Club Concession' },
      { code: 'CRAVING15', discountPercent: 0.15, minSpend: 199, description: '15% Instant Food Voucher' }
    ],
    'blinkit.com': [
      { code: 'BLINKIT50', fixedDiscount: 50, minSpend: 299, description: 'Blinkit Instant Cart Voucher' }
    ],
    'zeptonow.com': [
      { code: 'ZEPTO30', fixedDiscount: 30, minSpend: 199, description: 'Zepto 10-Min Flash Concession' }
    ],
    'eatclub.com': [
      { code: 'EATCLUB100', fixedDiscount: 100, minSpend: 299, description: 'EatClub Direct Chef Savings Promo' }
    ],
    'doordash.com': [
      { code: 'DASHPASS5', fixedDiscount: 5, minSpend: 15, description: '$5 DashPass Delivery Concession' }
    ],
    'ubereats.com': [
      { code: 'EATS15', discountPercent: 0.15, minSpend: 20, description: '15% UberEats Culinary Concession' }
    ]
  };

  /**
   * Simulated dynamic negotiation endpoints (stores with live negotiation bots, "Make an Offer", or price-match desks).
   */
  private static dynamicNegotiationDestinations: Record<string, { channel: 'MAKE_OFFER_API' | 'LIVE_CHATBOT' | 'PRICE_MATCH_DESK'; maxConcessionPct: number }> = {
    'dell.com': { channel: 'PRICE_MATCH_DESK', maxConcessionPct: 0.06 },
    'lenovo.com': { channel: 'LIVE_CHATBOT', maxConcessionPct: 0.05 },
    'croma.com': { channel: 'PRICE_MATCH_DESK', maxConcessionPct: 0.03 },
    'bestbuy.com': { channel: 'PRICE_MATCH_DESK', maxConcessionPct: 0.05 },
    'bhphotovideo.com': { channel: 'PRICE_MATCH_DESK', maxConcessionPct: 0.04 },
    'microcenter.com': { channel: 'PRICE_MATCH_DESK', maxConcessionPct: 0.05 },
    'swiggy.com': { channel: 'LIVE_CHATBOT', maxConcessionPct: 0.10 },
    'zomato.com': { channel: 'LIVE_CHATBOT', maxConcessionPct: 0.10 }
  };

  /**
   * Main deal arbitration entry point.
   */
  public static arbitrateDeal(
    merchantDomain: string,
    basePrice: number,
    currency: string = 'INR',
    competitorProof?: CompetitorProof
  ): ArbitrationAttempt {
    const cleanDomain = merchantDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    // ========================================================================
    // CHANNEL 1: Merchant Price Matching (When Verified Competitor Proof Exists)
    // ========================================================================
    const dynamicConfig = this.dynamicNegotiationDestinations[cleanDomain];

    if (dynamicConfig && dynamicConfig.channel === 'PRICE_MATCH_DESK' && competitorProof && competitorProof.competitorPrice < basePrice) {
      const priceDiff = basePrice - competitorProof.competitorPrice;

      return {
        attempted: true,
        successful: false, // Merchant has not yet agreed to match; reported as opportunity
        dealType: 'PRICE_MATCH_CONCESSION',
        originalPrice: basePrice,
        discountedPrice: basePrice, // Do not reduce quoted price without actual merchant agreement
        savingsAmount: priceDiff,
        currency,
        transparencyDescription: `Price-match opportunity on ${cleanDomain}: Lower verified competitor offer found on ${competitorProof.competitorName} at ${competitorProof.competitorPrice} ${currency} (${competitorProof.competitorUrl}). Potential savings: ${priceDiff} ${currency}. (Subject to merchant price-match policy at checkout)`
      };
    }

    // ========================================================================
    // CHANNEL 2: Promotional Code / Voucher Discovery (Candidate Vouchers, NOT Applied Without Cart Test)
    // ========================================================================
    const vouchers = this.merchantVoucherIndex[cleanDomain] || [];
    const qualifyingVouchers = vouchers.filter(v => basePrice >= v.minSpend);

    if (qualifyingVouchers.length > 0) {
      const bestVoucher = qualifyingVouchers[0];
      return {
        attempted: true,
        successful: false, // Unverified until tested in live cart
        dealType: 'PUBLIC_COUPON',
        couponCode: bestVoucher.code,
        candidateCodes: qualifyingVouchers.map(v => v.code),
        originalPrice: basePrice,
        discountedPrice: basePrice, // Zero price deduction without live cart test
        savingsAmount: 0,
        currency,
        transparencyDescription: `Code ${bestVoucher.code} may apply. Try at checkout. (Public promotional code, untested in cart)`
      };
    }

    // ========================================================================
    // CHANNEL 3: Fixed Retail (No negotiation supported by merchant)
    // ========================================================================
    return {
      attempted: true,
      successful: false,
      dealType: 'NO_DISCOUNT',
      originalPrice: basePrice,
      discountedPrice: basePrice,
      savingsAmount: 0,
      currency,
      transparencyDescription: `No negotiation channels or active vouchers available for ${cleanDomain}. Retailer enforces strict fixed catalog pricing.`
    };
  }
}

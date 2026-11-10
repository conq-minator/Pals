export interface TrustEvaluationSignals {
  domain: string;
  isAuthorizedDealer: boolean;
  hasPhysicalStores: boolean;
  returnWindowDays: number;
  supportsSecurePayments: boolean; // Supports PayPal, 3D-Secure, Escrow
  averageRating: number;           // 1.0 to 5.0
  reviewVolume: number;
  sslValid: boolean;
  domainAgeYears: number;
}

export interface TrustScoreResult {
  score: number; // 0 to 100
  trustTier: 'EXEMPLARY' | 'TRUSTED' | 'MODERATE' | 'SUSPICIOUS' | 'UNACCEPTABLE';
  reasons: string[];
  riskWarnings: string[];
}

export class ARBTrustScorer {
  /**
   * Known domain trust profiles for common e-commerce destinations.
   */
  private static verifiedDomainRegistry: Record<string, Partial<TrustEvaluationSignals>> = {
    'amazon.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 50000,
      sslValid: true,
      domainAgeYears: 12
    },
    'dominos.co.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.3,
      reviewVolume: 200000,
      sslValid: true,
      domainAgeYears: 20
    },
    'pizzahut.co.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.2,
      reviewVolume: 90000,
      sslValid: true,
      domainAgeYears: 18
    },
    'dominos.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 300000,
      sslValid: true,
      domainAgeYears: 28
    },
    'pharmeasy.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 60000,
      sslValid: true,
      domainAgeYears: 9
    },
    'netmeds.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 40000,
      sslValid: true,
      domainAgeYears: 10
    },
    'cvs.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 90000,
      sslValid: true,
      domainAgeYears: 28
    },
    'walgreens.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 85000,
      sslValid: true,
      domainAgeYears: 28
    },
    'amazon.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 500000,
      sslValid: true,
      domainAgeYears: 29
    },
    'mdcomputers.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 20000,
      sslValid: true,
      domainAgeYears: 12
    },
    'primeabgb.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 15000,
      sslValid: true,
      domainAgeYears: 12
    },
    'vedantcomputers.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 10000,
      sslValid: true,
      domainAgeYears: 15
    },
    'swiggy.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 120000,
      sslValid: true,
      domainAgeYears: 10
    },
    'zomato.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 150000,
      sslValid: true,
      domainAgeYears: 15
    },
    'blinkit.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 1,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 90000,
      sslValid: true,
      domainAgeYears: 11
    },
    'zeptonow.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 1,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 60000,
      sslValid: true,
      domainAgeYears: 4
    },
    'eatclub.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 35000,
      sslValid: true,
      domainAgeYears: 8
    },
    'doordash.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 200000,
      sslValid: true,
      domainAgeYears: 11
    },
    'ubereats.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 0,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 180000,
      sslValid: true,
      domainAgeYears: 9
    },
    'instacart.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 1,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 100000,
      sslValid: true,
      domainAgeYears: 12
    },
    'apollopharmacy.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.7,
      reviewVolume: 40000,
      sslValid: true,
      domainAgeYears: 20
    },
    '1mg.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 50000,
      sslValid: true,
      domainAgeYears: 9
    },
    'bigbasket.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 60000,
      sslValid: true,
      domainAgeYears: 13
    },
    'jiomart.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 40000,
      sslValid: true,
      domainAgeYears: 8
    },
    'myntra.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 70000,
      sslValid: true,
      domainAgeYears: 15
    },
    'nykaa.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 15,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 55000,
      sslValid: true,
      domainAgeYears: 12
    },
    'iherb.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.7,
      reviewVolume: 80000,
      sslValid: true,
      domainAgeYears: 25
    },
    'croma.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 12000,
      sslValid: true,
      domainAgeYears: 15
    },
    'reliancedigital.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.3,
      reviewVolume: 10000,
      sslValid: true,
      domainAgeYears: 10
    },
    'apple.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.9,
      reviewVolume: 100000,
      sslValid: true,
      domainAgeYears: 25
    },
    'lenovo.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 25000,
      sslValid: true,
      domainAgeYears: 20
    },
    'dell.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 30000,
      sslValid: true,
      domainAgeYears: 28
    },
    'flipkart.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 45000,
      sslValid: true,
      domainAgeYears: 17
    },
    'walmart.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 80000,
      sslValid: true,
      domainAgeYears: 28
    },
    'bestbuy.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 15,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 60000,
      sslValid: true,
      domainAgeYears: 27
    },
    'samsung.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.8,
      reviewVolume: 50000,
      sslValid: true,
      domainAgeYears: 25
    },
    'sony.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.8,
      reviewVolume: 40000,
      sslValid: true,
      domainAgeYears: 29
    },
    'shopatsc.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.7,
      reviewVolume: 15000,
      sslValid: true,
      domainAgeYears: 12
    },
    'bhphotovideo.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.8,
      reviewVolume: 75000,
      sslValid: true,
      domainAgeYears: 30
    },
    'microcenter.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 15,
      supportsSecurePayments: true,
      averageRating: 4.7,
      reviewVolume: 45000,
      sslValid: true,
      domainAgeYears: 26
    },
    'newegg.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.4,
      reviewVolume: 65000,
      sslValid: true,
      domainAgeYears: 23
    },
    'target.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 30,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 90000,
      sslValid: true,
      domainAgeYears: 25
    },
    'vijaysales.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.3,
      reviewVolume: 8000,
      sslValid: true,
      domainAgeYears: 16
    },
    'keychron.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 5000,
      sslValid: true,
      domainAgeYears: 5
    },
    'meckeys.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 3500,
      sslValid: true,
      domainAgeYears: 6
    },
    'genesispc.in': {
      isAuthorizedDealer: true,
      hasPhysicalStores: false,
      returnWindowDays: 7,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 2500,
      sslValid: true,
      domainAgeYears: 4
    },
    'asus.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.6,
      reviewVolume: 35000,
      sslValid: true,
      domainAgeYears: 27
    },
    'hp.com': {
      isAuthorizedDealer: true,
      hasPhysicalStores: true,
      returnWindowDays: 14,
      supportsSecurePayments: true,
      averageRating: 4.5,
      reviewVolume: 50000,
      sslValid: true,
      domainAgeYears: 29
    }
  };

  /**
   * Computes a deterministic 0-100 credibility score for a merchant listing.
   */
  public static evaluate(domain: string, merchantSignals?: Partial<TrustEvaluationSignals>): TrustScoreResult {
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const registered = this.verifiedDomainRegistry[cleanDomain] || {};

    const signals: TrustEvaluationSignals = {
      domain: cleanDomain,
      isAuthorizedDealer: merchantSignals?.isAuthorizedDealer ?? registered.isAuthorizedDealer ?? false,
      hasPhysicalStores: merchantSignals?.hasPhysicalStores ?? registered.hasPhysicalStores ?? false,
      returnWindowDays: merchantSignals?.returnWindowDays ?? registered.returnWindowDays ?? 0,
      supportsSecurePayments: merchantSignals?.supportsSecurePayments ?? registered.supportsSecurePayments ?? false,
      averageRating: merchantSignals?.averageRating ?? registered.averageRating ?? 3.0,
      reviewVolume: merchantSignals?.reviewVolume ?? registered.reviewVolume ?? 10,
      sslValid: merchantSignals?.sslValid ?? registered.sslValid ?? true,
      domainAgeYears: merchantSignals?.domainAgeYears ?? registered.domainAgeYears ?? 1
    };

    let score = 50; // Neutral baseline
    const reasons: string[] = [];
    const riskWarnings: string[] = [];

    // 1. SSL & Security Baseline
    if (signals.sslValid) {
      score += 10;
      reasons.push('Valid SSL encryption & verified domain certificate');
    } else {
      score -= 40;
      riskWarnings.push('Missing or invalid SSL certificate - critical security risk');
    }

    // 2. Authorized Brand Dealer Status
    if (signals.isAuthorizedDealer) {
      score += 15;
      reasons.push('Verified authorized brand retailer / direct manufacturer');
    } else {
      riskWarnings.push('Third-party reseller; verify manufacturer warranty coverage');
    }

    // 3. Physical Presence & Service Centers
    if (signals.hasPhysicalStores) {
      score += 10;
      reasons.push('Established retail network with walk-in physical service locations');
    }

    // 4. Return & Replacement Policy
    if (signals.returnWindowDays >= 14) {
      score += 10;
      reasons.push(`Generous ${signals.returnWindowDays}-day return/replacement window`);
    } else if (signals.returnWindowDays >= 7) {
      score += 5;
      reasons.push(`Standard ${signals.returnWindowDays}-day return policy`);
    } else {
      score -= 15;
      riskWarnings.push('No explicit return window or final-sale restriction');
    }

    // 5. Payment Safety (PayPal, Escrow, 3D-Secure)
    if (signals.supportsSecurePayments) {
      score += 10;
      reasons.push('Supports buyer-protected payment rails (PayPal / 3D-Secure)');
    } else {
      score -= 20;
      riskWarnings.push('Lacks recognized buyer-protected payment methods');
    }

    // 6. Review Density & Rating
    if (signals.averageRating >= 4.5 && signals.reviewVolume > 500) {
      score += 10;
      reasons.push(`Consistently high rating (${signals.averageRating}/5 across ${signals.reviewVolume.toLocaleString()} verified reviews)`);
    } else if (signals.averageRating < 3.5) {
      score -= 15;
      riskWarnings.push(`Low customer satisfaction rating (${signals.averageRating}/5)`);
    }

    // 7. Domain Longevity
    if (signals.domainAgeYears >= 5) {
      score += 5;
      reasons.push(`Established business domain (${signals.domainAgeYears}+ years operating history)`);
    } else if (signals.domainAgeYears < 1) {
      score -= 20;
      riskWarnings.push('Newly registered domain (< 1 year old)');
    }

    // Clamp score 0 - 100
    const finalScore = Math.max(0, Math.min(100, score));

    let trustTier: TrustScoreResult['trustTier'] = 'MODERATE';
    if (finalScore >= 90) trustTier = 'EXEMPLARY';
    else if (finalScore >= 80) trustTier = 'TRUSTED';
    else if (finalScore >= 60) trustTier = 'MODERATE';
    else if (finalScore >= 40) trustTier = 'SUSPICIOUS';
    else trustTier = 'UNACCEPTABLE';

    return {
      score: finalScore,
      trustTier,
      reasons,
      riskWarnings
    };
  }
}


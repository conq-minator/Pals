import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';

export interface ScoredListing {
  listing: MerchantListing;
  compositeScore: number; // 0 to 100
  scoreBreakdown: {
    priceEfficiency: number; // 0 to 100
    deliverySpeed: number;   // 0 to 100
    specFit: number;         // 0 to 100
    trust: number;           // 0 to 100
    unitValue?: number;      // 0 to 100
  };
  badges: string[];
  rationale: string;
}

export interface MultiFactorRankingResult {
  rankedListings: ScoredListing[];
  bestOverall?: ScoredListing;
  cheapest?: ScoredListing;
  fastest?: ScoredListing;
}

/**
 * ARBMultiFactorRanker
 * Evaluates listings across multiple dimensions (price, delivery speed, specs fit, trust, unit value)
 * instead of naive cheapest-first sorting.
 */
export class ARBMultiFactorRanker {
  /**
   * Ranks listings and assigns labelled picks (Best Overall, Cheapest, Fastest).
   */
  public static rank(
    listings: MerchantListing[],
    payload: ARBResearchPayload
  ): MultiFactorRankingResult {
    if (!listings || listings.length === 0) {
      return { rankedListings: [] };
    }

    const { budgetCeiling, preferredBrands, category } = payload;
    const isFoodOrQuick = category === 'food' || category === 'quick_commerce' ||
      listings.some(l => l.pros.some(p => /min delivery|mins delivery/i.test(p)));

    // Dynamic weights per category
    const weights = isFoodOrQuick
      ? { price: 0.30, speed: 0.40, trust: 0.20, spec: 0.10 }
      : { price: 0.40, speed: 0.10, trust: 0.25, spec: 0.25 };

    const scored: ScoredListing[] = listings.map(listing => {
      // 1. Price Efficiency: (1 - landedCost / budgetCeiling) scaled to 0-100
      const priceRatio = Math.max(0, 1 - (listing.totalLandedCost / budgetCeiling));
      const priceEfficiency = Math.round(priceRatio * 100);

      // 2. Delivery Speed Score
      let deliverySpeed = 50; // standard 3-5 days
      const allText = [...listing.pros, ...listing.cons].join(' ').toLowerCase();

      if (allText.includes('10-15 min') || allText.includes('15 min') || allText.includes('instant delivery')) {
        deliverySpeed = 100;
      } else if (allText.includes('30 min') || allText.includes('20-30 min') || allText.includes('45 min')) {
        deliverySpeed = 90;
      } else if (allText.includes('same day') || allText.includes('today')) {
        deliverySpeed = 80;
      } else if (allText.includes('tomorrow') || allText.includes('next day') || allText.includes('1 day')) {
        deliverySpeed = 70;
      } else if (allText.includes('2-3 days') || allText.includes('2 days')) {
        deliverySpeed = 60;
      }

      // 3. Spec Fit Score
      let specFit = 90;
      if (listing.unverifiedSpecs && listing.unverifiedSpecs.length > 0) {
        specFit -= (listing.unverifiedSpecs.length * 15);
      }
      if (preferredBrands && preferredBrands.some(pb =>
        listing.productTitle.toLowerCase().includes(pb.toLowerCase()) ||
        listing.merchantName.toLowerCase().includes(pb.toLowerCase())
      )) {
        specFit += 15;
      }
      specFit = Math.max(0, Math.min(100, specFit));

      // 4. Trust Score
      const trust = Math.max(0, Math.min(100, listing.trustScore));

      // 5. Composite Score
      const compositeScore = Math.round(
        (priceEfficiency * weights.price) +
        (deliverySpeed * weights.speed) +
        (trust * weights.trust) +
        (specFit * weights.spec)
      );

      const badges: string[] = [];
      const rationaleParts: string[] = [];

      if (priceEfficiency >= 80) {
        rationaleParts.push(`exceptional price efficiency (${listing.totalLandedCost.toLocaleString()} ${listing.currency})`);
      }
      if (deliverySpeed >= 90) {
        rationaleParts.push('ultra-fast delivery ETA');
      }
      if (trust >= 90) {
        rationaleParts.push('exemplary merchant credibility');
      }

      const rationale = rationaleParts.length > 0
        ? `Selected for ${rationaleParts.join(', ')}.`
        : `Balanced offer at ${listing.totalLandedCost.toLocaleString()} ${listing.currency}.`;

      return {
        listing,
        compositeScore,
        scoreBreakdown: {
          priceEfficiency,
          deliverySpeed,
          specFit,
          trust
        },
        badges,
        rationale
      };
    });

    // Sort by composite score descending
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Identify labelled picks
    const bestOverall = scored[0];
    bestOverall.badges.push('👑 Best Overall');

    // Find cheapest
    const cheapestCandidate = [...scored].sort((a, b) => a.listing.totalLandedCost - b.listing.totalLandedCost)[0];
    if (cheapestCandidate) {
      if (!cheapestCandidate.badges.includes('👑 Best Overall')) {
        cheapestCandidate.badges.push('💰 Cheapest Option');
      } else {
        cheapestCandidate.badges.push('💰 Lowest Price');
      }
    }

    // Find fastest
    const fastestCandidate = [...scored].sort((a, b) => b.scoreBreakdown.deliverySpeed - a.scoreBreakdown.deliverySpeed)[0];
    if (fastestCandidate && fastestCandidate.scoreBreakdown.deliverySpeed > 50) {
      if (!fastestCandidate.badges.some(b => b.includes('Fastest'))) {
        fastestCandidate.badges.push('⚡ Fastest Delivery');
      }
    }

    return {
      rankedListings: scored,
      bestOverall,
      cheapest: cheapestCandidate,
      fastest: fastestCandidate
    };
  }
}

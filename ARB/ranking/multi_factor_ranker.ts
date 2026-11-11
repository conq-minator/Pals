import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';

export interface ScoredListing {
  listing: MerchantListing;
  compositeScore: number; // 0 to 100
  /** Parsed delivery estimate (upper bound, minutes) when the listing states one. */
  etaMinutes?: number;
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
  bestValue?: ScoredListing;
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
   * Reads a structured delivery estimate ("Delivery ETA: 25-30 mins", "Estimated delivery: 2-4 Days",
   * "Same Day", "Next Day") from a listing's pros and returns the upper bound in minutes.
   */
  public static parseEtaMinutes(pros: string[]): number | undefined {
    const line = pros.find(p => /^(?:delivery eta|estimated delivery)\s*:/i.test(p));
    if (!line) return undefined;
    const text = line.split(':').slice(1).join(':').toLowerCase();
    if (text.includes('same day')) return 12 * 60;
    if (text.includes('next day')) return 24 * 60;
    const m = text.match(/([0-9]+)(?:\s*-\s*([0-9]+))?\s*(min|hour|hr|day)/);
    if (!m) return undefined;
    const upper = parseInt(m[2] || m[1], 10);
    const unit = m[3];
    return unit === 'min' ? upper : (unit === 'day' ? upper * 24 * 60 : upper * 60);
  }

  /**
   * Resolves a deliveryBy constraint string (e.g. 'instant', 'same-day', 'next-day') to target upper-bound minutes.
   */
  public static resolveRequestedEtaMinutes(deliveryBy?: string): number | undefined {
    if (!deliveryBy) return undefined;
    const clean = deliveryBy.toLowerCase().trim();
    if (clean === 'instant' || clean.includes('15 min') || clean.includes('30 min') || clean.includes('fastest') || clean.includes('asap')) {
      return 60;
    }
    if (clean === 'same-day' || clean.includes('same day') || clean.includes('today')) {
      return 12 * 60;
    }
    if (clean === 'next-day' || clean.includes('next day') || clean.includes('tomorrow')) {
      return 24 * 60;
    }
    return ARBMultiFactorRanker.parseEtaMinutes([`Estimated delivery: ${deliveryBy}`]);
  }

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
    const isFoodOrQuick = ['food', 'food_delivery', 'quick_commerce'].includes(category || '') ||
      listings.some(l => l.pros.some(p => /min delivery|mins delivery|delivery eta/i.test(p)));

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

      const etaMinutes = ARBMultiFactorRanker.parseEtaMinutes(listing.pros);
      if (etaMinutes !== undefined) {
        if (etaMinutes <= 15) deliverySpeed = 100;
        else if (etaMinutes <= 60) deliverySpeed = 90;
        else if (etaMinutes <= 6 * 60) deliverySpeed = 85;
        else if (etaMinutes <= 24 * 60) deliverySpeed = 80;
        else if (etaMinutes <= 2 * 24 * 60) deliverySpeed = 70;
        else if (etaMinutes <= 4 * 24 * 60) deliverySpeed = 60;
      } else if (allText.includes('10-15 min') || allText.includes('15 min') || allText.includes('instant delivery')) {
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

      // Timeline constraint (deliveryBy)
      const requestedEtaMinutes = ARBMultiFactorRanker.resolveRequestedEtaMinutes(payload.deliveryBy);
      if (requestedEtaMinutes !== undefined && etaMinutes !== undefined) {
        if (etaMinutes <= requestedEtaMinutes) {
          deliverySpeed = Math.min(100, deliverySpeed + 15);
          const meetNote = `Meets requested delivery timeline (${payload.deliveryBy})`;
          if (!listing.pros.includes(meetNote)) listing.pros.push(meetNote);
        } else {
          deliverySpeed = Math.max(10, deliverySpeed - 30);
          const delayNote = `Delivery ETA (${Math.round(etaMinutes / 60)}h) exceeds requested timeline (${payload.deliveryBy})`;
          if (!listing.cons.includes(delayNote)) listing.cons.push(delayNote);
        }
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

      // Soft preferences fit
      if (payload.softPreferences && Object.keys(payload.softPreferences).length > 0) {
        for (const [prefKey, prefVal] of Object.entries(payload.softPreferences)) {
          const valStr = String(prefVal).toLowerCase();
          const titleLower = listing.productTitle.toLowerCase();
          const prosLower = listing.pros.join(' ').toLowerCase();
          if (titleLower.includes(valStr) || prosLower.includes(valStr)) {
            specFit += 10;
            const softNote = `Satisfies preferred spec: ${prefKey} (${prefVal})`;
            if (!listing.pros.includes(softNote)) {
              listing.pros.push(softNote);
            }
          }
        }
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
        etaMinutes,
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

    // Identify labelled picks (Best Value, Cheapest, Fastest)
    const bestValue = scored[0];
    bestValue.badges.push('💎 Best Value');

    // Find cheapest
    const cheapestCandidate = [...scored].sort((a, b) => a.listing.totalLandedCost - b.listing.totalLandedCost)[0];
    if (cheapestCandidate) {
      if (!cheapestCandidate.badges.includes('💎 Best Value')) {
        cheapestCandidate.badges.push('💰 Cheapest Option');
      } else {
        cheapestCandidate.badges.push('💰 Lowest Price');
      }
    }

    // Find fastest
    const fastestCandidate = [...scored].sort((a, b) =>
      b.scoreBreakdown.deliverySpeed - a.scoreBreakdown.deliverySpeed ||
      (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity) ||
      a.listing.totalLandedCost - b.listing.totalLandedCost
    )[0];
    if (fastestCandidate && fastestCandidate.scoreBreakdown.deliverySpeed > 50) {
      if (!fastestCandidate.badges.some(b => b.includes('Fastest'))) {
        fastestCandidate.badges.push('⚡ Fastest Delivery');
      }
    }

    return {
      rankedListings: scored,
      bestOverall: bestValue,
      bestValue,
      cheapest: cheapestCandidate,
      fastest: fastestCandidate
    };
  }
}

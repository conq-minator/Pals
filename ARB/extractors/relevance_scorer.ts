import { ARBQueryMatcher } from './query_matcher.js';

export interface RelevanceScoreResult {
  isRelevant: boolean;
  score: number; // 0.0 to 1.0
  rejectionReason?: string;
  matchedTokens: string[];
}

/**
 * ARBRelevanceScorer
 * Scores candidate listings against query intent by semantic tokens and category rules.
 * Replaces fragile hardcoded string branches with structured token & category validation.
 */
export class ARBRelevanceScorer {
  private static ACCESSORY_KEYWORDS = new Set([
    'case', 'cover', 'tempered glass', 'screen protector', 'skin',
    'pouch', 'sleeve', 'strap', 'stand', 'mount', 'cleaning kit'
  ]);

  private static COMPONENT_VS_SYSTEM_MAP: Record<string, { systemTokens: string[]; componentTokens: string[] }> = {
    pc_memory: {
      systemTokens: ['laptop', 'notebook', 'desktop pc', 'all-in-one', 'tower'],
      componentTokens: ['ram', 'memory', 'ddr4', 'ddr5', 'so-dimm', 'dimm', 'udimm']
    }
  };

  /**
   * Evaluates relevance of a candidate listing against a search query.
   */
  public static evaluateRelevance(
    productQuery: string,
    listingTitle: string,
    category?: string
  ): RelevanceScoreResult {
    const queryTokens = ARBQueryMatcher.extractCoreTokens(productQuery.toLowerCase());
    const titleTokens = ARBQueryMatcher.extractCoreTokens(listingTitle.toLowerCase());
    const titleLower = listingTitle.toLowerCase();
    const queryLower = productQuery.toLowerCase();

    // 0. A curated catalog entry matched through an alias/synonym is relevant by construction.
    if (ARBQueryMatcher.catalogVouches(productQuery, listingTitle)) {
      return { isRelevant: true, score: 1.0, matchedTokens: queryTokens };
    }

    // 1. Accessory Guard:
    // If the query is NOT looking for an accessory, but the listing is an accessory, reject.
    const queryWantsAccessory = Array.from(this.ACCESSORY_KEYWORDS).some(kw => queryLower.includes(kw));
    if (!queryWantsAccessory) {
      const isAccessoryListing = Array.from(this.ACCESSORY_KEYWORDS).some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(titleLower);
      });
      if (isAccessoryListing) {
        return {
          isRelevant: false,
          score: 0.1,
          rejectionReason: 'Listing identified as an accessory, not the primary requested product.',
          matchedTokens: []
        };
      }
    }

    // 2. Component vs System Confusion Guard:
    // If user asked specifically for RAM/memory modules without mentioning "laptop" or "pc",
    // reject whole computer systems that happen to have that RAM spec.
    const isRamQuery = queryTokens.some(t => ['ram', 'ddr4', 'ddr5', 'sodimm', 'dimm'].includes(t));
    const userExplicitlyRequestedComputer = queryTokens.some(t => ['laptop', 'notebook', 'pc', 'macbook', 'desktop'].includes(t));

    if (isRamQuery && !userExplicitlyRequestedComputer) {
      const isMemoryModule = /so-?dimm|\bu?dimm\b|laptop ram|desktop ram|ram kit|memory module/i.test(titleLower);
      const isCompleteSystem = !isMemoryModule && ['laptop', 'notebook', 'macbook'].some(sys => titleLower.includes(sys));
      if (isCompleteSystem) {
        return {
          isRelevant: false,
          score: 0.15,
          rejectionReason: 'Complete laptop/system offered when user requested standalone memory module.',
          matchedTokens: []
        };
      }
    }

    // 3. Token Overlap & Weighting
    const matchedTokens: string[] = [];
    let weightedMatches = 0;
    let totalWeight = 0;

    for (const token of queryTokens) {
      // Weight numeric model identifiers or key nouns higher
      const isModelNumber = /[0-9]/.test(token);
      const weight = isModelNumber ? 2.0 : 1.0;
      totalWeight += weight;

      if (titleLower.includes(token)) {
        matchedTokens.push(token);
        weightedMatches += weight;
      }
    }

    const overlapRatio = totalWeight > 0 ? weightedMatches / totalWeight : 0;
    const isRelevant = overlapRatio >= 0.4 || matchedTokens.length >= Math.min(2, queryTokens.length);

    return {
      isRelevant,
      score: Math.min(1.0, Math.round(overlapRatio * 100) / 100),
      rejectionReason: isRelevant ? undefined : `Insufficient token relevance (${Math.round(overlapRatio * 100)}% match)`,
      matchedTokens
    };
  }
}

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
    'pouch', 'sleeve', 'strap', 'stand', 'mount', 'cleaning kit',
    'cutter', 'maker', 'boiler', 'knife', 'frother', 'press',
    'paper', 'dress', 'bag', 'parts',
    'oven', 'stone', 'charger', 'bottle', 'toaster', 'tray', 'beater',
    'box', 'tawa', 'cooler', 'scissors', 'dock', 'heatsink', 'dish',
    'syrup', 'adapter', 'hub', 'backpack', 'peel', 'paddle'
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

    // 1. Accessory Guard (symmetric check):
    const queryAccessoryKeywords = Array.from(this.ACCESSORY_KEYWORDS).filter(kw => {
      if (kw === 'oven' && queryLower.includes('oven story')) return false;
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(queryLower);
    });
    const queryWantsAccessory = queryAccessoryKeywords.length > 0;

    const listingAccessoryKeywords = Array.from(this.ACCESSORY_KEYWORDS).filter(kw => {
      if (kw === 'oven' && titleLower.includes('oven story')) return false;
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(titleLower);
    });
    const isAccessoryListing = listingAccessoryKeywords.length > 0;

    if (!queryWantsAccessory && isAccessoryListing) {
      return {
        isRelevant: false,
        score: 0.1,
        rejectionReason: 'Listing identified as an accessory, not the primary requested product.',
        matchedTokens: []
      };
    }

    if (queryWantsAccessory) {
      const matchesAccessory = queryAccessoryKeywords.some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(titleLower);
      });
      if (!matchesAccessory) {
        return {
          isRelevant: false,
          score: 0.0,
          rejectionReason: 'User requested an accessory/tool, but listing is the primary product.',
          matchedTokens: []
        };
      }
    }

    // 0. A curated catalog entry matched through an alias/synonym is relevant by construction.
    if (ARBQueryMatcher.catalogVouches(productQuery, listingTitle)) {
      return { isRelevant: true, score: 1.0, matchedTokens: queryTokens };
    }

    // 2. Component vs System Confusion Guard:
    // If user asked specifically for RAM/memory modules without mentioning "laptop" or "pc",
    // reject whole computer systems that happen to have that RAM spec.
    const isRamQuery = queryTokens.some(t => ['ram', 'ddr4', 'ddr5', 'sodimm', 'dimm'].includes(t)) ||
      (/\b(corsair|crucial|kingston|g\.?skill|xpg|teamgroup|patriot)\b/i.test(queryLower) && /\b[0-9]{1,3}\s*gb\b/i.test(queryLower));
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

    // 3. Token Overlap & Category Weighting
    const matchedTokens: string[] = [];
    let weightedMatches = 0;
    let totalWeight = 0;

    const isLaptopCategory = category === 'laptops' || /laptop|gaming|notebook/i.test(queryLower);
    const isLaptopListing = /rtx|gtx|intel core|ryzen|gaming laptop|vivobook|thin 15|victus|loq|tuf|nitro|legion|macbook/i.test(titleLower);

    for (const token of queryTokens) {
      const isModelNumber = /[0-9]/.test(token);
      const weight = isModelNumber ? 2.0 : 1.0;
      totalWeight += weight;

      if (titleLower.includes(token)) {
        matchedTokens.push(token);
        weightedMatches += weight;
      } else if (isLaptopCategory && isLaptopListing && (token === 'laptop' || token === 'notebook')) {
        matchedTokens.push(token);
        weightedMatches += weight;
      } else if (isLaptopCategory && isLaptopListing && token === 'gaming' && /rtx|gtx|gaming|144hz|120hz|165hz/i.test(titleLower)) {
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

/**
 * ARBQueryMatcher
 * Precision query intent and token validation engine.
 * Prevents category pollution (e.g. returning generic laptops when the user asks for a Mac Mini).
 */
export class ARBQueryMatcher {
  private static STOP_WORDS = new Set([
    'find', 'get', 'search', 'show', 'compare', 'cheapest', 'cheap', 'best', 
    'under', 'below', 'less', 'than', 'max', 'maximum', 'budget', 'price', 
    'on', 'with', 'for', 'and', 'or', 'vs', 'in', 'to', 'at', 'buy', 
    'a', 'an', 'the', 'of', 'upto', 'around', 'within', 'delivery', 'pincode',
    'least', 'official', 'store', 'stores', 'only', 'verified'
  ]);

  /**
   * Extracts essential search keywords from the user prompt.
   */
  public static extractCoreTokens(query: string): string[] {
    const cleaned = query
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawTokens = cleaned.split(' ');
    const coreTokens: string[] = [];

    for (const token of rawTokens) {
      if (this.STOP_WORDS.has(token)) continue;
      // Skip pure numeric tokens or currency suffixes (e.g. 75k, 60000, 16gb, 512gb)
      if (/^[0-9]+[k]?$/.test(token)) continue;
      if (/^[0-9]+(gb|tb|hz)$/.test(token)) continue;
      if (token.length >= 2) {
        coreTokens.push(token);
      }
    }

    return coreTokens;
  }

  /**
   * Validates whether a candidate listing matches the core product intent of the search query.
   */
  public static matchesIntent(query: string, productTitle: string, brand: string = ''): { matches: boolean; reason?: string } {
    const coreTokens = this.extractCoreTokens(query);
    if (coreTokens.length === 0) {
      return { matches: true }; // Generic search (e.g. "under 60k"), allow category matching
    }

    const titleLower = productTitle.toLowerCase();
    const brandLower = brand.toLowerCase();
    const combined = `${titleLower} ${brandLower}`;

    // Special cases for distinct product lines:
    // 1. "Mac mini" -> MUST have both "mac" and "mini"
    if (coreTokens.includes('mac') && coreTokens.includes('mini')) {
      const isMacMini = combined.includes('mac') && combined.includes('mini');
      if (!isMacMini) {
        return { matches: false, reason: 'Query specifies Mac Mini, but listing is not a Mac Mini' };
      }
      return { matches: true };
    }

    // 2. Specific Brand / Model constraints:
    // Check if distinct model keywords exist in the query (e.g., "macbook", "victus", "legion", "loq", "tuf", "xps", "thinkpad")
    const criticalModels = [
      'macbook', 'thinkpad', 'victus', 'legion', 'loq', 'tuf', 'xps', 'pavilion', 
      'zenbook', 'vivobook', 'nitro', 'predator', 'ideapad', 'inspiron', 'envy',
      'iphone', 'ipad', 'galaxy', 'pixel'
    ];

    for (const model of criticalModels) {
      if (coreTokens.includes(model)) {
        if (!combined.includes(model)) {
          return { matches: false, reason: `Query specifically requests model family "${model}"` };
        }
      }
    }

    // 3. Category cross-check:
    // If user asked for headphones, don't return laptops or monitors
    const isHeadphoneQuery = coreTokens.some(t => ['headphone', 'headphones', 'earphone', 'earphones', 'earbuds'].includes(t));
    if (isHeadphoneQuery) {
      const isHeadphoneItem = ['headphone', 'headphones', 'earbuds', 'noise cancel', 'wh-1000xm', 'qc45', 'momentum'].some(k => combined.includes(k));
      if (!isHeadphoneItem) {
        return { matches: false, reason: 'Query asks for headphones, but listing is another device type' };
      }
    }

    // 4. Food & Biryani intent validation (handle spelling variants like biryani, biriyani, briyani)
    const isBiryaniQuery = coreTokens.some(t => ['biryani', 'biriyani', 'briyani'].includes(t));
    if (isBiryaniQuery) {
      const hasBiryani = ['biryani', 'biriyani', 'briyani'].some(b => combined.includes(b));
      if (!hasBiryani) {
        return { matches: false, reason: 'Query specifies Biryani, but listing is not Biryani' };
      }
      return { matches: true };
    }

    // 5. Quick-commerce essentials cross-check (milk, bread, eggs, grocery)
    const isDairyOrBakery = coreTokens.some(t => ['milk', 'bread', 'eggs', 'curd', 'paneer', 'butter'].includes(t));
    if (isDairyOrBakery) {
      const hasTarget = coreTokens.some(t => combined.includes(t));
      if (!hasTarget) {
        return { matches: false, reason: 'Query specifies dairy/bakery, but listing does not match' };
      }
      return { matches: true };
    }

    // 4. Token overlap ratio for general queries
    // At least 50% of core descriptive tokens or the brand must match
    let matchCount = 0;
    for (const token of coreTokens) {
      if (combined.includes(token)) {
        matchCount++;
      }
    }

    const matchRatio = matchCount / coreTokens.length;
    if (coreTokens.length <= 2 && matchCount === 0) {
      return { matches: false, reason: `Listing does not match query keywords: [${coreTokens.join(', ')}]` };
    }

    if (coreTokens.length > 2 && matchRatio < 0.3) {
      return { matches: false, reason: `Low relevance match: ${matchCount}/${coreTokens.length} tokens matched` };
    }

    return { matches: true };
  }
}


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
    'least', 'official', 'store', 'stores', 'only', 'verified',
    // conversational / delivery filler words (e.g. "order me a pizza near me asap")
    'order', 'me', 'my', 'near', 'nearby', 'want', 'need', 'some', 'please', 'pls',
    'deliver', 'delivered', 'home', 'now', 'asap', 'quick', 'fast', 'instant',
    'online', 'cheapest', 'lowest', 'rs', 'inr', 'usd', 'it', 'is', 'can', 'you', 'from',
    // time and delivery duration words
    'min', 'mins', 'minute', 'minutes', 'sec', 'secs', 'second', 'seconds', 'hr', 'hrs', 'hour', 'hours', 'day', 'days', 'week', 'weeks', 'today', 'tomorrow',
    // dietary words are handled as hard constraints (mandatorySpecifications.dietary), not keywords
    'veg', 'vegetarian', 'non-veg', 'nonveg', 'non', 'pure', 'eggless', 'vegan'
  ]);

  /**
   * Optional hook: lets a curated catalog vouch for a listing that was matched through an
   * alias/synonym rather than literal keyword overlap. Registered by the everyday catalog.
   */
  public static catalogVouches: (query: string, listingTitle: string) => boolean = () => false;

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
  public static matchesIntent(query: string, productTitle: string, brand: string = '', category?: string): { matches: boolean; reason?: string } {
    const coreTokens = this.extractCoreTokens(query);
    if (coreTokens.length === 0) {
      return { matches: true }; // Generic search (e.g. "under 60k"), allow category matching
    }
    if (this.catalogVouches(query, productTitle)) {
      return { matches: true };
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
      if (coreTokens.some(t => ['dock', 'stand', 'hub', 'case', 'mount'].includes(t))) {
        if (!combined.includes('dock') && !combined.includes('stand') && !combined.includes('hub')) {
          return { matches: false, reason: 'Query specifies Mac Mini dock/accessory, but listing is the Mac Mini computer itself' };
        }
      }
      return { matches: true };
    }

    // 1b. Laptop accessory guard (e.g. "laptop charger", "laptop bag")
    if (coreTokens.includes('laptop') || coreTokens.includes('notebook')) {
      const laptopAccessories = ['charger', 'adapter', 'bag', 'sleeve', 'case', 'skin', 'stand', 'cooler'];
      const queryWantsLapAcc = coreTokens.some(t => laptopAccessories.includes(t));
      if (queryWantsLapAcc) {
        const listingHasAcc = laptopAccessories.some(a => combined.includes(a));
        if (!listingHasAcc) {
          return { matches: false, reason: 'Query requests laptop accessory, but listing is a laptop computer' };
        }
      }
    }

    // 1c. Strict GPU constraint (e.g. "rtx 4060 laptop")
    const queryGpuMatch = query.toLowerCase().match(/\b(rtx\s*[0-9]{4}(?:\s*ti)?|gtx\s*[0-9]{4})\b/i);
    if (queryGpuMatch) {
      const targetGpu = queryGpuMatch[1].replace(/\s+/g, '');
      const listingCombinedNoSpace = combined.replace(/\s+/g, '');
      if (!listingCombinedNoSpace.includes(targetGpu)) {
        return { matches: false, reason: `Query specifically requires GPU "${queryGpuMatch[1]}"` };
      }
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

    // 6. Token overlap ratio for general queries
    const isLaptopListing = category === 'laptops' || /rtx|gtx|intel core|ryzen|gaming laptop|vivobook|thin 15|victus|loq|tuf|nitro|legion|macbook/i.test(combined);

    let matchCount = 0;
    for (const token of coreTokens) {
      if (combined.includes(token)) {
        matchCount++;
      } else if (isLaptopListing && (token === 'laptop' || token === 'notebook')) {
        matchCount++;
      } else if (isLaptopListing && token === 'gaming' && /rtx|gtx|gaming|144hz|120hz|165hz/i.test(combined)) {
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


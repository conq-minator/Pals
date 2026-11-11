import { z } from 'zod';
import { ARBResearchPayload } from '../../shared/types/index.js';
import { ARBEverydayCatalog } from '../providers/everyday_catalog.js';
import { SharedLLMGateway } from '../../shared/llm/index.js';

export const StructuredUserRequirementsSchema = z.object({
  productQuery: z.string().min(1),
  category: z.string().default('general'),
  quantity: z.number().int().positive().default(1),
  budget: z.object({
    ceiling: z.number().positive(),
    currency: z.string().default('INR'),
    flexibility: z.enum(['STRICT', 'FLEXIBLE_10_PERCENT', 'FLEXIBLE_20_PERCENT']).default('STRICT')
  }),
  hardConstraints: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  softPreferences: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  preferredBrands: z.array(z.string()).default([]),
  excludedBrands: z.array(z.string()).default([]),
  targetMerchants: z.array(z.string()).default([]),
  deliveryPostalCode: z.string().optional(),
  deliveryBy: z.string().optional(),
  minMerchantTrustScore: z.number().min(0).max(100).default(80)
});
export type StructuredUserRequirements = z.infer<typeof StructuredUserRequirementsSchema>;

export interface ExtractedRequirements {
  productQuery: string;
  category?: string;
  quantity: number;
  budgetCeiling: number;
  currency: string;
  budgetFlexibility: 'STRICT' | 'FLEXIBLE_10_PERCENT' | 'FLEXIBLE_20_PERCENT';
  mandatorySpecifications: Record<string, string | number | boolean>;
  softPreferences: Record<string, string | number | boolean>;
  preferredBrands: string[];
  excludedBrands: string[];
  targetMerchants: string[];
  deliveryPostalCode?: string;
  deliveryBy?: string;
  minMerchantTrustScore: number;
}

/**
 * ARBQueryExtractor
 * Intelligent requirement understanding & entity extractor for ARB.
 *
 * Implements structured Zod-validated requirement parsing with LLM reasoning,
 * deterministic cross-checking, must-have (hard) vs nice-to-have (soft) constraint separation,
 * quantity extraction, and offline fallback parsing.
 */
export class ARBQueryExtractor {
  private static currencySymbols: Record<string, string> = {
    '₹': 'INR',
    'rs': 'INR',
    'inr': 'INR',
    '$': 'USD',
    'usd': 'USD',
    '€': 'EUR',
    'eur': 'EUR',
    '£': 'GBP',
    'gbp': 'GBP'
  };

  private static commonBrands = [
    'Apple', 'Lenovo', 'Dell', 'HP', 'Asus', 'Acer', 'MSI', 'Samsung',
    'Sony', 'LG', 'Logitech', 'Razer', 'Corsair', 'Keychron', 'Bose',
    'Sennheiser', 'OnePlus', 'Google', 'Xiaomi', 'Realme', 'Dominos',
    'Pizza Hut', 'Amul', 'Hansaplast'
  ];

  private static supportedMerchants: Record<string, string> = {
    'amazon': 'amazon.in',
    'flipkart': 'flipkart.com',
    'walmart': 'walmart.com',
    'croma': 'croma.com',
    'reliance': 'reliancedigital.in',
    'reliance digital': 'reliancedigital.in',
    'bestbuy': 'bestbuy.com',
    'best buy': 'bestbuy.com',
    'apple': 'apple.com',
    'dell': 'dell.com',
    'lenovo': 'lenovo.com',
    'swiggy': 'swiggy.com',
    'instamart': 'swiggy.com',
    'zomato': 'zomato.com',
    'blinkit': 'blinkit.com',
    'zepto': 'zeptonow.com',
    'bigbasket': 'bigbasket.com',
    'jiomart': 'jiomart.com',
    'dominos': 'dominos',
    'pizza hut': 'pizzahut',
    'apollo': 'apollopharmacy.in',
    '1mg': '1mg.com',
    'pharmeasy': 'pharmeasy.in',
    'netmeds': 'netmeds.com',
    'md computers': 'mdcomputers.in',
    'mdcomputers': 'mdcomputers.in',
    'primeabgb': 'primeabgb.com',
    'newegg': 'newegg.com',
    'doordash': 'doordash.com',
    'uber eats': 'ubereats.com',
    'ubereats': 'ubereats.com'
  };

  /**
   * Extracts structured query entities from natural language text.
   * Deterministic extraction with rigorous cross-checks.
   */
  public static extractFromText(prompt: string, defaultBudget: number = 200000): ExtractedRequirements {
    const text = prompt.trim();
    const lower = text.toLowerCase();

    // 1. Detect Category first to avoid cross-domain spec collisions (e.g. iPhone 128GB being misread as RAM)
    let category = 'general';
    const isPhoneOrTablet = /\b(?:iphone|ipad|galaxy\s*s\d+|pixel\s*\d+|smartphone|mobile\s*phone|phone|handset)\b/i.test(lower);
    const everydayVertical = ARBEverydayCatalog.detectVertical(text);

    if (everydayVertical) {
      category = everydayVertical;
    } else if (isPhoneOrTablet) {
      category = 'smartphones';
    } else if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('macbook')) {
      category = 'laptops';
    } else if (lower.includes('monitor') || lower.includes('display') || lower.includes('screen')) {
      category = 'monitors';
    } else if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('headphones') || lower.includes('earbuds')) {
      category = 'peripherals';
    } else if (lower.includes('ram') || lower.includes('ddr4') || lower.includes('ddr5') || lower.includes('dimm')) {
      category = 'pc_components';
    }

    // 2. Extract Currency
    let currency = 'INR';
    if (/\b(?:usd|\$)\b/i.test(text)) {
      currency = 'USD';
    } else if (/\b(?:eur|€)\b/i.test(text)) {
      currency = 'EUR';
    } else if (/\b(?:gbp|£)\b/i.test(text)) {
      currency = 'GBP';
    } else if (/\b(?:inr|₹|rs\.?)\b/i.test(text)) {
      currency = 'INR';
    }

    // 3. Extract Budget & Budget Flexibility
    let budgetCeiling = defaultBudget;
    let budgetFlexibility: 'STRICT' | 'FLEXIBLE_10_PERCENT' | 'FLEXIBLE_20_PERCENT' = 'STRICT';

    if (/\b(?:strictly under|strict budget|hard cap|no more than)\b/i.test(lower)) {
      budgetFlexibility = 'STRICT';
    } else if (/\b(?:around|roughly|about|flexible|stretch(?:able)?)\b/i.test(lower)) {
      budgetFlexibility = 'FLEXIBLE_10_PERCENT';
    }

    const budgetRegex = /(?:under|below|less than|max(?:imum)?|budget(?: of)?|upto|within|around)\s*(?:(₹|\$|€|£|rs\.?|inr|usd|eur|gbp)\s*)?([0-9,]+(?:\.[0-9]{1,2})?)\s*(k|thousand|lakh|lac)?\s*(inr|usd|eur|gbp|₹|\$|€|£|\/-)?/i;
    const budgetMatch = text.match(budgetRegex);

    if (budgetMatch) {
      const rawSymbol = budgetMatch[1] || budgetMatch[5];
      if (rawSymbol && rawSymbol !== '/-') {
        const cleanSymbol = rawSymbol.toLowerCase().replace(/\./g, '');
        currency = this.currencySymbols[cleanSymbol] || currency;
      }
      let rawNumber = budgetMatch[2].replace(/,/g, '');
      let parsed = parseFloat(rawNumber);
      const multiplier = (budgetMatch[3] || '').toLowerCase();
      if (multiplier === 'k' || multiplier === 'thousand') {
        parsed *= 1000;
      } else if (multiplier === 'lakh' || multiplier === 'lac') {
        parsed *= 100000;
      }
      if (!isNaN(parsed) && parsed > 0) {
        budgetCeiling = parsed;
      }
    } else {
      // Fallback: Check for raw currency expressions like "₹75000", "75k inr", "$1200", "$30"
      const fallbackRegex = /(?:(₹|\$|€|£|rs\.?|inr|usd|eur|gbp)\s*)([0-9,]+(?:\.[0-9]{1,2})?)\s*(k)?/i;
      const fbMatch = text.match(fallbackRegex);
      if (fbMatch) {
        const cleanSymbol = fbMatch[1].toLowerCase().replace(/\./g, '');
        currency = this.currencySymbols[cleanSymbol] || currency;
        let val = parseFloat(fbMatch[2].replace(/,/g, ''));
        if (fbMatch[3]?.toLowerCase() === 'k') val *= 1000;
        if (!isNaN(val) && val > 0) budgetCeiling = val;
      }
    }

    // Adjust default budget if target currency is USD/EUR/GBP and default was in INR
    if (budgetCeiling === 200000 && (currency === 'USD' || currency === 'EUR' || currency === 'GBP')) {
      budgetCeiling = 2500;
    }

    // 4. Extract Quantity
    let quantity = 1;
    const qtyMatch = lower.match(/\b([1-9][0-9]?)\s*(?:pizzas?|items?|units?|packs?|boxes?|burgers?|bottles?|strips?|orders?)\b/i) ||
                     lower.match(/\b(?:qty|quantity|count)\s*[:=]?\s*([1-9][0-9]?)\b/i) ||
                     lower.match(/\b(two|three|four|five|six|ten|dozen)\s+(?:pizzas?|items?|units?|packs?|boxes?|orders?)\b/i);
    if (qtyMatch) {
      const wordMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10, dozen: 12 };
      quantity = wordMap[qtyMatch[1].toLowerCase()] || parseInt(qtyMatch[1], 10) || 1;
    } else {
      // General form: a small count at the start of the request or right after an ordering verb,
      // followed by a product word ("3 butter naan", "order 2 pepperoni pizzas").
      // A number glued to / followed by a unit is a spec or pack size, not a count
      // ("16gb ram", "15 inch laptop", "1 litre milk", "12 eggs", "10 strips").
      const NOT_A_COUNT = '(?:gb|tb|mb|hz|mhz|mg|kg|g|gm|gms|ml|l|ltr|litres?|liters?|inch|inches|in|cm|mm|m|x|k|w|v|mah|pcs?|pieces?|eggs?|strips?|tablets?|capsules?|years?|months?|days?|hours?|mins?|minutes?|star|th|st|nd|rd|gen|series|pro|plus|max)\\b';
      const generalQty = lower.match(new RegExp(`(?:^|\\b(?:order|buy|get|send|want|need|book)\\s+(?:me\\s+)?)([1-9][0-9]?)\\s+(?!${NOT_A_COUNT})[a-z]`, 'i'));
      if (generalQty) {
        const n = parseInt(generalQty[1], 10);
        if (n >= 2 && n <= 50) quantity = n;
      }
    }

    // 5. Must-Have (Hard) vs Nice-To-Have (Soft) Constraints
    const mandatorySpecs: Record<string, string | number | boolean> = {};
    const softPreferences: Record<string, string | number | boolean> = {};

    // Dietary requirement ("veg pizza", "pure veg", "non-veg burger", "vegan")
    if (/\bnon[- ]?veg(?:etarian)?\b/i.test(lower)) {
      mandatorySpecs['dietary'] = 'non-veg';
    } else if (/\bvegan\b/i.test(lower)) {
      mandatorySpecs['dietary'] = 'vegan';
    } else if (/\b(?:veg|vegetarian|pure veg|eggless)\b/i.test(lower)) {
      mandatorySpecs['dietary'] = 'veg';
    }

    // Check soft RAM preference (e.g. "16GB, ideally 32GB" or "minimum 16GB, preferred 32GB")
    const softRamMatch = lower.match(/(?:ideally|preferably|preferred|nice to have|if possible)\s*([0-9]{1,3})\s*(?:gb|gigabytes?)/i);
    if (softRamMatch) {
      softPreferences['ram_gb'] = parseInt(softRamMatch[1], 10);
    }

    // Hard RAM extraction
    // Crucial: If query is for a smartphone (e.g. "iphone 15 128gb"), "128gb" is storage, NOT RAM!
    if (!isPhoneOrTablet) {
      const ramMatch = lower.match(/(?:at least|minimum|min)?\s*([0-9]{1,3})\s*(?:gb|gigabytes?)\s*(?:ram|memory|unified|ddr[45])?/i);
      // Only extract as RAM if explicit RAM term is present, or if it matches standard RAM capacities (8, 16, 24, 32, 64) in a PC/laptop context
      if (ramMatch) {
        const ramVal = parseInt(ramMatch[1], 10);
        const hasRamTerm = /ram|memory|unified|ddr/i.test(ramMatch[0]);
        if (hasRamTerm || [8, 16, 24, 32, 64].includes(ramVal)) {
          // If soft preference already took this number, keep hard RAM as the base requirement
          const hardRamPrefix = lower.match(/([0-9]{1,3})\s*(?:gb)?\s*,\s*(?:ideally|preferably|preferred)/i);
          if (hardRamPrefix) {
            mandatorySpecs['ram_gb'] = parseInt(hardRamPrefix[1], 10);
          } else if (!softRamMatch || ramVal !== softPreferences['ram_gb']) {
            mandatorySpecs['ram_gb'] = ramVal;
          }
        }
      }
    } else {
      // For phones, only extract RAM if explicitly specified as "NN GB RAM"
      const phoneRamMatch = lower.match(/([0-9]{1,2})\s*(?:gb|gigabytes?)\s*ram/i);
      if (phoneRamMatch) {
        mandatorySpecs['ram_gb'] = parseInt(phoneRamMatch[1], 10);
      }
    }

    // Storage extraction (supports 128GB, 256GB, 512GB, 1024GB, 2048GB, 1TB, 2TB)
    const storageMatch = lower.match(/([0-9]{1,4})\s*(tb)\s*(?:ssd|storage|hdd|nvme)?/i) ||
                         lower.match(/([0-9]{1,4})\s*(gb)\s*(?:ssd|storage|hdd|nvme|rom)/i) ||
                         lower.match(/(?:ssd|storage|hdd|nvme)\s*(?:of\s*)?([0-9]{1,4})\s*(gb|tb)/i);

    if (storageMatch) {
      const unit = (storageMatch[2] || storageMatch[1]).toUpperCase();
      const numStr = (!isNaN(parseInt(storageMatch[1], 10))) ? storageMatch[1] : storageMatch[2];
      const val = parseInt(numStr, 10);
      if (!isNaN(val)) {
        mandatorySpecs['storage'] = unit.includes('TB') ? `${val * 1024}GB` : `${val}GB`;
        mandatorySpecs['storage_gb'] = unit.includes('TB') ? val * 1024 : val;
      }
    } else if (isPhoneOrTablet) {
      // For phones: e.g. "iphone 15 128gb" -> 128GB is internal storage!
      const phoneStorageMatch = lower.match(/([0-9]{2,4})\s*(?:gb|gigabytes?)\b/i);
      if (phoneStorageMatch) {
        const val = parseInt(phoneStorageMatch[1], 10);
        mandatorySpecs['storage'] = `${val}GB`;
        mandatorySpecs['storage_gb'] = val;
      }
    }

    // GPU / Graphics extraction
    const gpuMatch = lower.match(/(rtx\s*[0-9]{4}(?:\s*ti)?|gtx\s*[0-9]{4}|radeon\s*[a-z0-9]+|apple\s*m[1-4](?:\s*pro|\s*max)?)/i);
    if (gpuMatch) {
      mandatorySpecs['gpu'] = gpuMatch[1].toUpperCase();
    }

    // Refresh rate (e.g. "144hz", "240 hz")
    const refreshMatch = lower.match(/([0-9]{2,3})\s*hz/i);
    if (refreshMatch) {
      mandatorySpecs['refresh_rate_hz'] = parseInt(refreshMatch[1], 10);
    }

    // Resolution (e.g. "4k", "1440p", "1080p", "fhd", "qhd")
    const resMatch = lower.match(/\b(4k|1440p|1080p|fhd|qhd|uhd|oled)\b/i);
    if (resMatch) {
      const res = resMatch[1].toUpperCase();
      mandatorySpecs['resolution'] = res === '4K' ? '4K UHD' : (res === '1440P' || res === 'QHD' ? '2K QHD' : (res === '1080P' ? 'FHD' : res));
    }

    // 6. Extract Brand Preferences & Exclusions
    const preferredBrands: string[] = [];
    const excludedBrands: string[] = [];

    const exclusionClauseMatch = lower.match(/(?:don't (?:want|show|like)|avoid|exclude|never show|no|without|except)\s+([a-z0-9\s,]+)/i);
    const exclusionText = exclusionClauseMatch ? exclusionClauseMatch[1] : '';

    for (const brand of this.commonBrands) {
      const bLower = brand.toLowerCase();
      const directNegativeRegex = new RegExp(`(?:not|no|avoid|except|without|exclude|never)\\s+(?:a\\s+)?${bLower}`, 'i');
      
      if (directNegativeRegex.test(lower) || (exclusionText && exclusionText.includes(bLower))) {
        if (!excludedBrands.includes(brand)) {
          excludedBrands.push(brand);
        }
      } else if (new RegExp(`\\b${bLower}\\b`, 'i').test(lower)) {
        if (!preferredBrands.includes(brand)) {
          preferredBrands.push(brand);
        }
      }
    }

    // 7. Targeted Merchants
    const targetMerchants: string[] = [];
    for (const [key, domain] of Object.entries(this.supportedMerchants)) {
      if (
        new RegExp(`\\b(?:between|compare|from|on|at|only|via|using)\\s+(?:the\\s+)?${key}\\b`, 'i').test(lower) ||
        (lower.includes('only') && lower.includes(key)) ||
        (lower.includes('compare') && lower.includes(key))
      ) {
        if (!targetMerchants.includes(domain)) {
          targetMerchants.push(domain);
        }
      }
    }

    // 8. Postal Code
    let deliveryPostalCode: string | undefined;
    const pinMatch = lower.match(/(?:pincode|postal|zip(?:code)?|delivery to)\s*([0-9]{5,6})/i);
    if (pinMatch) {
      deliveryPostalCode = pinMatch[1];
    }

    // 9. Delivery Timeline
    let deliveryBy: string | undefined;
    if (/\b(?:urgent|fastest|asap|instant|10\s*mins?|30\s*mins?)\b/i.test(lower)) {
      deliveryBy = 'instant';
    } else if (/\b(?:today|same\s*day)\b/i.test(lower)) {
      deliveryBy = 'same-day';
    } else if (/\b(?:tomorrow|next\s*day)\b/i.test(lower)) {
      deliveryBy = 'next-day';
    }

    // 10. Minimum Merchant Trust Score
    let minMerchantTrustScore = 80;
    if (lower.includes('trusted only') || lower.includes('official only') || lower.includes('reputable')) {
      minMerchantTrustScore = 90;
    }

    return {
      productQuery: text,
      category,
      quantity,
      budgetCeiling,
      currency,
      budgetFlexibility,
      mandatorySpecifications: mandatorySpecs,
      softPreferences,
      preferredBrands,
      excludedBrands,
      targetMerchants,
      deliveryPostalCode,
      deliveryBy,
      minMerchantTrustScore
    };
  }

  /**
   * LLM-driven structured requirement extraction with Zod schema validation
   * and fallback to deterministic extraction.
   */
  public static async extractWithLLM(prompt: string, defaultBudget: number = 200000): Promise<ExtractedRequirements> {
    const fallback = this.extractFromText(prompt, defaultBudget);

    try {
      const llm = SharedLLMGateway.getInstance().getProvider();
      const response = await llm.generate([
        {
          role: 'system',
          content: [
            'You are ARB Requirement Intelligence.',
            'Extract structured shopping requirements into strict JSON matching this schema:',
            '{',
            '  "productQuery": string,',
            '  "category": string,',
            '  "quantity": number,',
            '  "budget": { "ceiling": number, "currency": "INR"|"USD"|"EUR"|"GBP", "flexibility": "STRICT"|"FLEXIBLE_10_PERCENT" },',
            '  "hardConstraints": Record<string, string|number|boolean>,',
            '  "softPreferences": Record<string, string|number|boolean>,',
            '  "preferredBrands": string[],',
            '  "excludedBrands": string[],',
            '  "targetMerchants": string[],',
            '  "deliveryPostalCode": string optional,',
            '  "deliveryBy": string optional,',
            '  "minMerchantTrustScore": number',
            '}',
            'Note: On smartphones, numbers like 128GB or 256GB are storage, NOT RAM. For food, capture dish and dietary constraints. Separate must-haves (hardConstraints) from nice-to-haves (softPreferences).'
          ].join('\n')
        },
        {
          role: 'user',
          content: prompt
        }
      ], { responseFormat: 'json' });

      if (response && response.content) {
        const parsed = JSON.parse(response.content);
        const validated = StructuredUserRequirementsSchema.safeParse(parsed);
        if (validated.success) {
          const v = validated.data;
          // Deterministic sanity cross-check: Ensure budget ceiling isn't hallucinated without basis
          const regexCeiling = fallback.budgetCeiling;
          const ceiling = (regexCeiling > 0 && regexCeiling !== defaultBudget) ? regexCeiling : v.budget.ceiling;

          return {
            productQuery: v.productQuery || prompt,
            category: v.category || fallback.category,
            quantity: v.quantity || fallback.quantity,
            budgetCeiling: ceiling,
            currency: v.budget.currency || fallback.currency,
            budgetFlexibility: v.budget.flexibility,
            mandatorySpecifications: { ...v.hardConstraints, ...fallback.mandatorySpecifications },
            softPreferences: { ...v.softPreferences, ...fallback.softPreferences },
            preferredBrands: Array.from(new Set([...v.preferredBrands, ...fallback.preferredBrands])),
            excludedBrands: Array.from(new Set([...v.excludedBrands, ...fallback.excludedBrands])),
            targetMerchants: Array.from(new Set([...v.targetMerchants, ...fallback.targetMerchants])),
            deliveryPostalCode: v.deliveryPostalCode || fallback.deliveryPostalCode,
            deliveryBy: v.deliveryBy || fallback.deliveryBy,
            minMerchantTrustScore: v.minMerchantTrustScore || fallback.minMerchantTrustScore
          };
        }
      }
    } catch {
      // LLM offline or parse error; fallback used safely
    }

    return fallback;
  }

  /**
   * Converts ExtractedRequirements into a validated ARBResearchPayload.
   */
  public static toPayload(req: ExtractedRequirements): ARBResearchPayload {
    const specs = { ...req.mandatorySpecifications };
    if (req.targetMerchants.length > 0) {
      specs['target_merchants'] = req.targetMerchants.join(',');
    }
    return {
      productQuery: req.productQuery,
      category: req.category,
      quantity: req.quantity || 1,
      budgetCeiling: req.budgetCeiling,
      currency: req.currency,
      mandatorySpecifications: specs,
      softPreferences: req.softPreferences || {},
      preferredBrands: req.preferredBrands.length > 0 ? req.preferredBrands : undefined,
      excludedBrands: req.excludedBrands.length > 0 ? req.excludedBrands : undefined,
      deliveryPostalCode: req.deliveryPostalCode,
      deliveryBy: req.deliveryBy,
      minMerchantTrustScore: req.minMerchantTrustScore
    };
  }
}

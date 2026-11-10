import { ARBResearchPayload } from '../../shared/types/index.js';

export interface ExtractedRequirements {
  productQuery: string;
  category?: string;
  budgetCeiling: number;
  currency: string;
  mandatorySpecifications: Record<string, string | number | boolean>;
  preferredBrands: string[];
  excludedBrands: string[];
  targetMerchants: string[];
  deliveryPostalCode?: string;
  minMerchantTrustScore: number;
}

/**
 * Natural-language requirement understanding & entity extractor for ARB.
 * Converts complex user search prompts into structured query constraints.
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
    'Sennheiser', 'OnePlus', 'Google', 'Xiaomi', 'Realme'
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
    'lenovo': 'lenovo.com'
  };

  /**
   * Extracts structured query entities from natural language text.
   */
  public static extractFromText(prompt: string, defaultBudget: number = 200000): ExtractedRequirements {
    const text = prompt.trim();
    const lower = text.toLowerCase();

    // 1. Extract Currency & Budget
    let currency = 'INR';
    let budgetCeiling = defaultBudget;

    // Matches e.g. "under ₹75,000", "below 75k", "max $1.2k", "budget 50000/-"
    const budgetRegex = /(?:under|below|less than|max(?:imum)?|budget(?: of)?|upto|within|around)\s*(?:(₹|\$|€|£|rs\.?|inr|usd|eur|gbp)\s*)?([0-9,]+(?:\.[0-9]{1,2})?)\s*(k|thousand|lakh|lac)?\s*(inr|usd|eur|gbp|₹|\$|€|£|\/-)?/i;
    const budgetMatch = text.match(budgetRegex);

    if (budgetMatch) {
      const rawSymbol = budgetMatch[1] || budgetMatch[5];
      if (rawSymbol && rawSymbol !== '/-') {
        const cleanSymbol = rawSymbol.toLowerCase().replace(/\./g, '');
        currency = this.currencySymbols[cleanSymbol] || 'INR';
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
      // Fallback: Check for raw currency expressions like "₹75000", "75k inr", "$1200"
      const fallbackRegex = /(?:(₹|\$|€|£|rs\.?|inr|usd|eur|gbp)\s*)([0-9,]+(?:\.[0-9]{1,2})?)\s*(k)?/i;
      const fbMatch = text.match(fallbackRegex);
      if (fbMatch) {
        const cleanSymbol = fbMatch[1].toLowerCase().replace(/\./g, '');
        currency = this.currencySymbols[cleanSymbol] || 'INR';
        let val = parseFloat(fbMatch[2].replace(/,/g, ''));
        if (fbMatch[3]?.toLowerCase() === 'k') val *= 1000;
        if (!isNaN(val) && val > 0) budgetCeiling = val;
      }
    }

    // 2. Extract Category
    let category = 'general';
    if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('macbook')) {
      category = 'laptops';
    } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('smartphone')) {
      category = 'smartphones';
    } else if (lower.includes('monitor') || lower.includes('display') || lower.includes('screen')) {
      category = 'monitors';
    } else if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('headphones') || lower.includes('earbuds')) {
      category = 'peripherals';
    }

    // 3. Extract Technical Specifications
    const mandatorySpecs: Record<string, string | number | boolean> = {};

    // RAM extraction (e.g. "16gb ram", "32 gb", "8gb unified")
    const ramMatch = lower.match(/([0-9]{1,3})\s*(?:gb|gigabytes?)\s*(?:ram|memory|unified)?/i);
    if (ramMatch) {
      mandatorySpecs['ram_gb'] = parseInt(ramMatch[1], 10);
    }

    // Storage extraction (must have explicit storage indicator like ssd, storage, hdd, nvme, or tb)
    const storageMatch = lower.match(/([0-9]{1,4})\s*(tb)\s*(?:ssd|storage|hdd|nvme)?/i) ||
                         lower.match(/([0-9]{1,4})\s*(gb)\s*(?:ssd|storage|hdd|nvme|rom)/i) ||
                         lower.match(/(?:ssd|storage|hdd|nvme)\s*(?:of\s*)?([0-9]{1,4})\s*(gb|tb)/i);
    if (storageMatch) {
      const unit = (storageMatch[2] || storageMatch[1]).toUpperCase();
      const numStr = (!isNaN(parseInt(storageMatch[1], 10))) ? storageMatch[1] : storageMatch[2];
      const val = parseInt(numStr, 10);
      if (!isNaN(val)) {
        mandatorySpecs['storage'] = unit.includes('TB') ? `${val * 1024}GB` : `${val}GB`;
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
    const resMatch = lower.match(/(4k|1440p|1080p|fhd|qhd|uhd|oled)/i);
    if (resMatch) {
      mandatorySpecs['resolution'] = resMatch[1].toUpperCase();
    }

    // 4. Extract Brand Preferences & Exclusions
    const preferredBrands: string[] = [];
    const excludedBrands: string[] = [];

    // Check for broad exclusion clauses like "exclude [brands]", "don't want [brands]", "avoid [brands]"
    const exclusionClauseMatch = lower.match(/(?:don't (?:want|show|like)|avoid|exclude|never show|no|without|except)\s+([a-z0-9\s,]+)/i);
    const exclusionText = exclusionClauseMatch ? exclusionClauseMatch[1] : '';

    for (const brand of this.commonBrands) {
      const bLower = brand.toLowerCase();
      const directNegativeRegex = new RegExp(`(?:not|no|avoid|except|without|exclude|never)\\s+(?:a\\s+)?${bLower}`, 'i');
      
      if (directNegativeRegex.test(lower) || (exclusionText && exclusionText.includes(bLower))) {
        if (!excludedBrands.includes(brand)) {
          excludedBrands.push(brand);
        }
      } else if (lower.includes(bLower)) {
        if (!preferredBrands.includes(brand)) {
          preferredBrands.push(brand);
        }
      }
    }

    // 5. Extract Targeted Specific Merchants (e.g. "compare between Amazon and Flipkart", "from Walmart only")
    const targetMerchants: string[] = [];
    const merchantClauseMatch = lower.match(/(?:between|from|on|check|at|only)\s+([a-z0-9\s,andor]+)/i);
    const merchantContext = merchantClauseMatch ? merchantClauseMatch[1] : lower;

    for (const [key, domain] of Object.entries(this.supportedMerchants)) {
      // Check if user specifically instructed to search or compare this merchant
      const targetRegex = new RegExp(`(?:between|compare|from|on|only|check|with)?\\s*(?:\\b${key}\\b)`, 'i');
      if (
        (lower.includes(`between`) && lower.includes(key)) ||
        (lower.includes(`only`) && lower.includes(key)) ||
        (lower.includes(`compare`) && lower.includes(key)) ||
        (merchantContext.includes(key) && (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('walmart') || lower.includes('croma')))
      ) {
        if (!targetMerchants.includes(domain)) {
          targetMerchants.push(domain);
        }
      }
    }

    // 6. Postal Code (e.g. "delivery to 560001", "pincode 110001", "zip 94016")
    let deliveryPostalCode: string | undefined;
    const pinMatch = lower.match(/(?:pincode|postal|zip(?:code)?|delivery to)\s*([0-9]{5,6})/i);
    if (pinMatch) {
      deliveryPostalCode = pinMatch[1];
    }

    // 7. Minimum Merchant Trust Score
    let minMerchantTrustScore = 80;
    if (lower.includes('trusted only') || lower.includes('official only') || lower.includes('reputable')) {
      minMerchantTrustScore = 90;
    }

    return {
      productQuery: text,
      category,
      budgetCeiling,
      currency,
      mandatorySpecifications: mandatorySpecs,
      preferredBrands,
      excludedBrands,
      targetMerchants,
      deliveryPostalCode,
      minMerchantTrustScore
    };
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
      budgetCeiling: req.budgetCeiling,
      currency: req.currency,
      mandatorySpecifications: specs,
      preferredBrands: req.preferredBrands.length > 0 ? req.preferredBrands : undefined,
      excludedBrands: req.excludedBrands.length > 0 ? req.excludedBrands : undefined,
      deliveryPostalCode: req.deliveryPostalCode,
      minMerchantTrustScore: req.minMerchantTrustScore
    };
  }
}


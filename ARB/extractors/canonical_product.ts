import { MerchantListing } from '../../shared/types/index.js';

export interface CanonicalProductIdentity {
  canonicalKey: string;
  brand: string;
  model: string;
  variantSignature: string;
  gtinOrAsin?: string;
}

export interface CanonicalProductGroup {
  canonicalKey: string;
  canonicalTitle: string;
  brand: string;
  model: string;
  bestListing: MerchantListing;
  allOffers: MerchantListing[];
  merchantCount: number;
  minLandedCost: number;
  maxLandedCost: number;
  arbitrationSavings: number;
  alternativeMerchants: Array<{
    merchantName: string;
    domain: string;
    landedCost: number;
    url: string;
  }>;
}

/**
 * ARBCanonicalIdentity
 * Generates deterministic canonical product keys from brand, model series,
 * and key hardware/flavor variant parameters.
 *
 * Distinguishes critical variants (e.g. CL30 vs CL36 CAS latency, DDR4 vs DDR5,
 * 16GB vs 32GB, SO-DIMM vs Desktop) while matching the same product across
 * disparate merchant naming conventions.
 */
export class ARBCanonicalIdentity {
  /**
   * Generates a canonical identity and key for a product listing.
   */
  public static extractIdentity(
    title: string,
    brandHint?: string,
    specs?: Record<string, any>,
    url?: string
  ): CanonicalProductIdentity {
    const cleanTitle = title.toLowerCase();

    // 1. ASIN / GTIN extraction from URL or SKU if present
    let gtinOrAsin: string | undefined;
    if (url) {
      const asinMatch = url.match(/\/dp\/([B0-9A-Z]{10})/i) || url.match(/\/gp\/product\/([B0-9A-Z]{10})/i);
      if (asinMatch) {
        gtinOrAsin = asinMatch[1].toUpperCase();
      }
    }

    // 2. Resolve normalized brand
    const brand = this.normalizeBrand(cleanTitle, brandHint);

    // 3. Resolve model family
    const model = this.normalizeModel(cleanTitle, brand);

    // 4. Resolve variant signature (RAM, DDR, Speed, CAS Latency, Form Factor, Size, GPU, etc.)
    const variantParts: string[] = [];

    // Hardware Specs
    // CAS Latency (e.g. CL30, CL36, C30, C36)
    const clMatch = cleanTitle.match(/\b(?:cl|c)\s*(30|32|36|38|40)\b/i);
    if (clMatch) {
      variantParts.push(`cl${clMatch[1]}`);
    }

    // RAM Speed (e.g. 5200mhz, 5600mhz, 6000mhz, 6400mhz)
    const speedMatch = cleanTitle.match(/\b(4800|5200|5600|6000|6400|7200)\s*(?:mhz|mt\/s)?\b/i);
    if (speedMatch) {
      variantParts.push(`${speedMatch[1]}mhz`);
    }

    // DDR Generation (DDR4 vs DDR5)
    if (/\bddr5\b/i.test(cleanTitle)) {
      variantParts.push('ddr5');
    } else if (/\bddr4\b/i.test(cleanTitle)) {
      variantParts.push('ddr4');
    }

    // Capacity (e.g. 16gb, 32gb, 64gb, 128gb, 512gb, 1tb, 2tb)
    const capMatch = cleanTitle.match(/\b(8|16|24|32|48|64|96|128)\s*gb\b/i);
    if (capMatch) {
      variantParts.push(`${capMatch[1]}gb`);
    }
    const storageMatch = cleanTitle.match(/\b(256|512)\s*gb\s*(?:ssd|nvme)?\b/i) || cleanTitle.match(/\b(1|2)\s*tb\s*(?:ssd|nvme)?\b/i);
    if (storageMatch) {
      variantParts.push(`${storageMatch[1].toLowerCase()}`);
    }

    // Form Factor (SO-DIMM / Laptop vs Desktop / UDIMM)
    if (/so-dimm|sodimm|for laptop|laptop ram/i.test(cleanTitle)) {
      variantParts.push('sodimm');
    } else if (/\bdesktop\b|desktop ram|desktop memory|udimm|dimm/i.test(cleanTitle)) {
      variantParts.push('desktop');
    }

    // Processors / Chips (M2, M3, M4, i5, i7, Ryzen 5, RTX 3050, RTX 4050, RTX 4060)
    const chipMatch = cleanTitle.match(/\b(m[1-4](?:\s*pro|\s*max)?)\b/i);
    if (chipMatch) {
      variantParts.push(chipMatch[1].replace(/\s+/g, '-').toLowerCase());
    }
    const gpuMatch = cleanTitle.match(/\b(rtx\s*(?:2050|3050|4050|4060|4070|4080|4090))\b/i);
    if (gpuMatch) {
      variantParts.push(gpuMatch[1].replace(/\s+/g, '-').toLowerCase());
    }

    // Food / Grocery / Pharmacy sizes
    const sizeMatch = cleanTitle.match(/\b(small|medium|large|regular|combo|serves\s*\d+-\d+|serves\s*\d+)\b/i);
    if (sizeMatch) {
      variantParts.push(sizeMatch[1].replace(/\s+/g, '').toLowerCase());
    }
    const weightMatch = cleanTitle.match(/\b(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|oz)\b/i);
    if (weightMatch) {
      variantParts.push(weightMatch[0].replace(/\s+/g, '').toLowerCase());
    }
    const packMatch = cleanTitle.match(/\bpack\s*of\s*(\d+)|\b(\d+)\s*(?:pack|strips|tablets|capsules)\b/i);
    if (packMatch) {
      variantParts.push(`pack${packMatch[1] || packMatch[2]}`);
    }
    const dimensionMatch = cleanTitle.match(/\b(\d+cm\s*x\s*\d+m|\d+\s*inch)\b/i);
    if (dimensionMatch) {
      variantParts.push(dimensionMatch[0].replace(/\s+/g, '').toLowerCase());
    }

    // Remove duplicates while preserving order
    const uniqueVariants = Array.from(new Set(variantParts)).sort();
    const variantSignature = uniqueVariants.join('-') || 'standard';

    // Canonical key formatting: brand:model:variant
    const canonicalKey = gtinOrAsin
      ? `${brand}:${gtinOrAsin.toLowerCase()}`
      : `${brand}:${model}:${variantSignature}`;

    return {
      canonicalKey,
      brand,
      model,
      variantSignature,
      gtinOrAsin
    };
  }

  /**
   * Normalizes brand names across different product naming variants.
   */
  public static normalizeBrand(cleanTitle: string, brandHint?: string): string {
    const raw = (brandHint || '').trim().toLowerCase();
    if (raw && raw !== 'unknown') {
      return raw.replace(/[^a-z0-9]/g, '');
    }

    const KNOWN_BRANDS = [
      'apple', 'corsair', 'crucial', 'g.skill', 'gskill', 'kingston', 'samsung',
      'dell', 'hp', 'lenovo', 'asus', 'msi', 'acer', 'sony', 'bose', 'sennheiser',
      'keychron', 'dominos', 'pizzahut', 'behrouz', 'bikkgane', 'hansaplast',
      'amul', 'mother dairy', 'neuherbs', 'true elements', 'sorich', 'nutiva'
    ];

    for (const b of KNOWN_BRANDS) {
      const bRegex = new RegExp(`\\b${b.replace('.', '\\.')}\\b`, 'i');
      if (bRegex.test(cleanTitle)) {
        return b === 'gskill' ? 'g.skill' : b.replace(/[^a-z0-9]/g, '');
      }
    }

    // Fallback: take first word if it looks like a brand
    const firstWord = cleanTitle.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '');
    return firstWord || 'generic';
  }

  /**
   * Normalizes model family from title and brand.
   */
  public static normalizeModel(cleanTitle: string, brand: string): string {
    const KNOWN_MODELS = [
      'vengeance', 'dominator', 'fury', 'ripjaws', 'trident', 'mac mini', 'macbook pro',
      'macbook air', 'thin 15', 'victus 15', 'loq 15', 'nitro v 15', 'g15', 'vivobook 16x',
      'wh-1000xm5', 'wh1000xm5', 'quietcomfort 45', 'momentum 4', 'k2', 'k3',
      'pepperoni pizza', 'chicken dum biryani', 'crepe bandage', 'regular bandage',
      'chia seeds', 'milk', 'eggs', 'butter naan', 'garlic naan'
    ];

    for (const m of KNOWN_MODELS) {
      if (cleanTitle.includes(m)) {
        return m.replace(/[^a-z0-9]/g, '-');
      }
    }

    // Default: clean stripped token
    return cleanTitle
      .replace(brand, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 2)
      .join('-')
      .replace(/[^a-z0-9-]/g, '') || 'base';
  }

  /**
   * Groups a list of merchant listings by canonical product identity.
   * Compares prices across merchants for identical items, augments pros with savings,
   * and returns grouped canonical entities.
   */
  public static groupOffersByProduct(listings: MerchantListing[]): CanonicalProductGroup[] {
    const groups = new Map<string, MerchantListing[]>();

    for (const listing of listings) {
      const identity = this.extractIdentity(
        listing.productTitle,
        undefined,
        undefined,
        listing.productUrl
      );
      const key = identity.canonicalKey;

      const existing = groups.get(key) || [];
      existing.push(listing);
      groups.set(key, existing);
    }

    const canonicalGroups: CanonicalProductGroup[] = [];

    for (const [key, groupListings] of groups.entries()) {
      // Sort offers by totalLandedCost ascending (cheapest first)
      groupListings.sort((a, b) => {
        if (a.totalLandedCost !== b.totalLandedCost) {
          return a.totalLandedCost - b.totalLandedCost;
        }
        return b.trustScore - a.trustScore;
      });

      const best = groupListings[0];
      const identity = this.extractIdentity(best.productTitle, undefined, undefined, best.productUrl);
      const minCost = best.totalLandedCost;
      const maxCost = groupListings[groupListings.length - 1].totalLandedCost;
      const savings = Math.max(0, maxCost - minCost);

      const alternativeMerchants = groupListings.slice(1).map(l => ({
        merchantName: l.merchantName,
        domain: l.merchantDomain,
        landedCost: l.totalLandedCost,
        url: l.productUrl
      }));

      // Augment the best pick's pros if cross-merchant arbitration found competitive savings
      if (alternativeMerchants.length > 0 && savings > 0) {
        const runnerUp = groupListings[1];
        const savingsMsg = `Arbitration verified: lowest price across ${groupListings.length} stores (saves ${savings.toLocaleString()} ${best.currency} vs ${runnerUp.merchantName})`;
        if (!best.pros.some(p => p.includes('Arbitration verified'))) {
          best.pros.unshift(savingsMsg);
        }
      }

      canonicalGroups.push({
        canonicalKey: key,
        canonicalTitle: best.productTitle,
        brand: identity.brand,
        model: identity.model,
        bestListing: best,
        allOffers: groupListings,
        merchantCount: groupListings.length,
        minLandedCost: minCost,
        maxLandedCost: maxCost,
        arbitrationSavings: savings,
        alternativeMerchants
      });
    }

    // Sort canonical groups by best landed cost
    canonicalGroups.sort((a, b) => a.minLandedCost - b.minLandedCost);
    return canonicalGroups;
  }
}

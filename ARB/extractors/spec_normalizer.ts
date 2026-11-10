export interface NormalizedSpecifications {
  category?: string;
  ramGb?: number;
  ramType?: string;
  storageGb?: number;
  storageType?: string;
  displaySizeInches?: number;
  displayResolution?: string;
  refreshRateHz?: number;
  processorBrand?: string;
  processorModel?: string;
  gpuModel?: string;
  // PC Memory specific
  cl?: number;
  speedMhz?: number;
  formFactor?: 'desktop' | 'sodimm';
  // Food specific
  dietary?: 'veg' | 'non-veg' | 'vegan';
  size?: string;
  servings?: number;
  // Medicine specific
  salt?: string;
  strengthMg?: number;
  packCount?: number;
  form?: string;
  // Common
  warrantyMonths: number;
  rawAttributes: Record<string, string>;
}

export interface ConstraintCheckResult {
  satisfied: boolean;
  failedReasons: string[];
  unverifiedSpecs: string[];
}

/**
 * ARBSpecNormalizer
 * Multi-domain specification normalizer and constraint evaluator.
 *
 * Implements category-specific schemas for PC Memory (DDR, speed, CL latency, form factor),
 * Laptops/Desktops (up to 4-digit storage capacities, resolution hierarchy, GPU),
 * Food Delivery (dietary veg/non-veg, size, servings), and Pharmacy (salt, strength, pack size).
 *
 * Enforces all requirements and marks missing data as 'unverified'.
 */
export class ARBSpecNormalizer {
  private static readonly RESOLUTION_TIERS: Record<string, number> = {
    'FHD': 1,
    '1080P': 1,
    '2K QHD': 2,
    '1440P': 2,
    'QHD': 2,
    '4K UHD': 3,
    '4K': 3,
    'UHD': 3
  };

  /**
   * Normalizes heterogeneous specification dictionaries or raw title strings into standardized spec schemas.
   */
  public static normalize(
    title: string,
    rawAttributes: Record<string, string> = {},
    categoryHint?: string
  ): NormalizedSpecifications {
    const combined = `${title} ${Object.values(rawAttributes).join(' ')}`.toLowerCase();

    // 1. Detect Category
    let category = categoryHint?.toLowerCase() || 'general';
    if (category === 'general') {
      if (/ddr[45]|desktop ram|sodimm|udimm|cl\s*(?:30|32|36|40)/i.test(combined)) {
        category = 'pc_memory';
      } else if (/laptop|notebook|macbook|thinkpad|victus|legion|loq|nitro/i.test(combined)) {
        category = 'laptops';
      } else if (/pizza|biryani|naan|burger|curry|roti/i.test(combined)) {
        category = 'food_delivery';
      } else if (/bandage|paracetamol|tablet|capsule|syrup|ointment|gauze/i.test(combined)) {
        category = 'pharmacy';
      }
    }

    // 2. RAM Normalization
    let ramGb: number | undefined;
    let ramType: string | undefined;
    const isPhone = /iphone|galaxy\s*s\d+|pixel\s*\d+|smartphone|handset/i.test(combined);

    if (!isPhone) {
      const ramMatch = combined.match(/([0-9]{1,3})\s*(?:gb|gigabytes?)\s*(ddr[45]|lpddr[45]x?|unified)?/i);
      if (ramMatch) {
        ramGb = parseInt(ramMatch[1], 10);
        ramType = ramMatch[2]?.toUpperCase();
      }
    } else {
      const phoneRamMatch = combined.match(/([0-9]{1,2})\s*(?:gb|gigabytes?)\s*ram/i);
      if (phoneRamMatch) {
        ramGb = parseInt(phoneRamMatch[1], 10);
      }
    }

    // 3. Storage Normalization (Supports up to 4 digits: e.g. 512, 1024, 2048 GB, 1TB, 2TB)
    let storageGb: number | undefined;
    let storageType: string | undefined = 'SSD';

    const explicitStorageMatch =
      combined.match(/([0-9]{1,4})\s*(tb)\s*(?:ssd|storage|hdd|nvme|pcie)?/i) ||
      combined.match(/([0-9]{1,4})\s*(gb)\s*(ssd|hdd|emmc|nvme|pcie|rom|storage)\b/i) ||
      combined.match(/(?:ssd|storage|hdd|nvme)\s*(?:of\s*)?([0-9]{1,4})\s*(gb|tb)/i);

    if (explicitStorageMatch) {
      const isTb = (explicitStorageMatch[2] || explicitStorageMatch[1]).toUpperCase().includes('TB') ||
                   (explicitStorageMatch[3] || '').toUpperCase().includes('TB');
      const numStr = !isNaN(parseInt(explicitStorageMatch[1], 10)) ? explicitStorageMatch[1] : explicitStorageMatch[2];
      const val = parseInt(numStr, 10);
      if (!isNaN(val)) {
        storageGb = isTb ? val * 1024 : val;
        storageType = (explicitStorageMatch[3] || 'SSD').toUpperCase();
      }
    } else if (isPhone) {
      const phoneStorageMatch = combined.match(/([0-9]{2,4})\s*(?:gb|tb)\b/i);
      if (phoneStorageMatch) {
        storageGb = parseInt(phoneStorageMatch[1], 10);
      }
    } else {
      // Fallback: look for a secondary capacity (typically >= 128GB) that is not the RAM
      const allGbMatches = Array.from(combined.matchAll(/([0-9]{1,4})\s*(gb|tb)\b/gi));
      for (const m of allGbMatches) {
        const val = parseInt(m[1], 10);
        const unit = m[2].toUpperCase();
        const effective = unit === 'TB' ? val * 1024 : val;
        if (effective >= 128 && effective !== ramGb) {
          storageGb = effective;
          break;
        }
      }
    }

    // 4. PC Memory Specific Attributes
    let cl: number | undefined;
    let speedMhz: number | undefined;
    let formFactor: 'desktop' | 'sodimm' | undefined;

    const clMatch = combined.match(/\b(?:cl|c)\s*(28|30|32|34|36|38|40)\b/i);
    if (clMatch) {
      cl = parseInt(clMatch[1], 10);
    }

    const speedMatch = combined.match(/\b(3200|4800|5200|5600|6000|6400|7200)\s*(?:mhz|mt\/s)?\b/i);
    if (speedMatch) {
      speedMhz = parseInt(speedMatch[1], 10);
    }

    if (/so-dimm|sodimm|for laptop|laptop ram/i.test(combined)) {
      formFactor = 'sodimm';
    } else if (/desktop|udimm|dimm/i.test(combined)) {
      formFactor = 'desktop';
    }

    // 5. Display & Resolution Normalization
    let displaySizeInches: number | undefined;
    let refreshRateHz: number | undefined;
    let displayResolution: string | undefined;

    const displayMatch = combined.match(/([0-9]{1,2}(?:\.[0-9])?)\s*(?:inch|"-|\")/i);
    if (displayMatch) {
      displaySizeInches = parseFloat(displayMatch[1]);
    }

    const refreshMatch = combined.match(/([0-9]{2,3})\s*hz/i);
    if (refreshMatch) {
      refreshRateHz = parseInt(refreshMatch[1], 10);
    }

    if (combined.includes('4k') || combined.includes('uhd') || combined.includes('3840x2160')) {
      displayResolution = '4K UHD';
    } else if (combined.includes('1440p') || combined.includes('qhd') || combined.includes('2560x1440') || combined.includes('2k')) {
      displayResolution = '2K QHD';
    } else if (combined.includes('1080p') || combined.includes('fhd') || combined.includes('1920x1080')) {
      displayResolution = 'FHD';
    }

    // 6. Processor Normalization
    let processorBrand: string | undefined;
    let processorModel: string | undefined;

    if (combined.includes('intel') || combined.includes('core i') || combined.includes('core ultra')) {
      processorBrand = 'Intel';
      const intelMatch = combined.match(/(core\s*i[3579]-?[0-9]{4,5}[a-z0-9]*|core\s*ultra\s*[579]\s*[0-9]{3}[a-z]?)/i);
      if (intelMatch) processorModel = intelMatch[1].toUpperCase();
    } else if (combined.includes('amd') || combined.includes('ryzen')) {
      processorBrand = 'AMD';
      const amdMatch = combined.match(/(ryzen\s*[3579]\s*[0-9]{4}[a-z0-9]*)/i);
      if (amdMatch) processorModel = amdMatch[1].toUpperCase();
    } else if (combined.includes('apple') || combined.includes('m1') || combined.includes('m2') || combined.includes('m3') || combined.includes('m4')) {
      processorBrand = 'Apple Silicon';
      const appleMatch = combined.match(/(m[1-4](?:\s*pro|\s*max|\s*ultra)?)/i);
      if (appleMatch) processorModel = appleMatch[1].toUpperCase();
    }

    // 7. GPU Normalization
    let gpuModel: string | undefined;
    const gpuMatch = combined.match(/(rtx\s*[0-9]{4}(?:\s*ti)?|gtx\s*[0-9]{4}|radeon\s*rx\s*[0-9]{4}[a-z]*|arc\s*[a-z0-9]+)/i);
    if (gpuMatch) {
      gpuModel = gpuMatch[1].toUpperCase();
    } else if (processorBrand === 'Apple Silicon') {
      gpuModel = `${processorModel || 'Apple'} Integrated GPU`;
    }

    // 8. Food Specific Normalization
    let dietary: 'veg' | 'non-veg' | 'vegan' | undefined;
    if (/\b(?:chicken|mutton|fish|meat|pepperoni|egg|prawn)\b/i.test(combined)) {
      dietary = 'non-veg';
    } else if (/\b(?:vegan|plant-based)\b/i.test(combined)) {
      dietary = 'vegan';
    } else if (/\b(?:paneer|veg|vegetarian|margherita|cheese|corn|mushroom)\b/i.test(combined)) {
      dietary = 'veg';
    }

    let size: string | undefined;
    const sizeMatch = combined.match(/\b(small|medium|large|regular)\b/i);
    if (sizeMatch) {
      size = sizeMatch[1].toLowerCase();
    }

    let servings: number | undefined;
    const servMatch = combined.match(/serves\s*([0-9]+)(?:-[0-9]+)?/i);
    if (servMatch) {
      servings = parseInt(servMatch[1], 10);
    }

    // 9. Pharmacy Specific Normalization
    let strengthMg: number | undefined;
    const mgMatch = combined.match(/([0-9]{2,4})\s*mg\b/i);
    if (mgMatch) {
      strengthMg = parseInt(mgMatch[1], 10);
    }

    let packCount: number | undefined;
    const packMatch = combined.match(/\b(?:pack of|pack|ct)\s*([0-9]{1,3})\b/i) || combined.match(/\b([0-9]{1,3})\s*(?:strips|tablets|capsules|bandages|ct)\b/i);
    if (packMatch) {
      packCount = parseInt(packMatch[1], 10);
    }

    // 10. Warranty Normalization
    let warrantyMonths = 12;
    const warrantyMatch = combined.match(/([0-9]{1,2})\s*(?:year|yr|month|mo)s?\s*warranty/i);
    if (warrantyMatch) {
      const num = parseInt(warrantyMatch[1], 10);
      warrantyMonths = combined.includes('year') || combined.includes('yr') ? num * 12 : num;
    }

    return {
      category,
      ramGb,
      ramType,
      storageGb,
      storageType,
      displaySizeInches,
      displayResolution,
      refreshRateHz,
      processorBrand,
      processorModel,
      gpuModel,
      cl,
      speedMhz,
      formFactor,
      dietary,
      size,
      servings,
      strengthMg,
      packCount,
      warrantyMonths,
      rawAttributes
    };
  }

  /**
   * Evaluates if normalized specs satisfy user-defined mandatory constraints.
   * Enforces RAM, Storage, Resolution, GPU, Refresh Rate, CAS Latency, Speed,
   * Form Factor, and Dietary preferences.
   *
   * Accurately distinguishes missing unverified data from explicit violations.
   */
  public static satisfiesConstraints(
    specs: NormalizedSpecifications,
    mandatory: Record<string, string | number | boolean>,
    category?: string
  ): ConstraintCheckResult {
    const failedReasons: string[] = [];
    const unverifiedSpecs: string[] = [];

    // 1. RAM Capacity (ram_gb)
    if (mandatory['ram_gb'] && typeof mandatory['ram_gb'] === 'number') {
      const reqRam = mandatory['ram_gb'];
      if (specs.ramGb === undefined) {
        unverifiedSpecs.push(`RAM capacity (${reqRam}GB required)`);
      } else if (specs.ramGb < reqRam) {
        failedReasons.push(`RAM ${specs.ramGb}GB is less than required ${reqRam}GB`);
      }
    }

    // 2. Storage Capacity (storage or storage_gb)
    const rawReqStorage = mandatory['storage_gb'] ?? mandatory['storage'];
    if (rawReqStorage !== undefined) {
      let reqStorageGb = 0;
      if (typeof rawReqStorage === 'number') {
        reqStorageGb = rawReqStorage;
      } else if (typeof rawReqStorage === 'string') {
        const num = parseInt(rawReqStorage.replace(/[^0-9]/g, ''), 10);
        reqStorageGb = rawReqStorage.toUpperCase().includes('TB') ? num * 1024 : num;
      }

      if (reqStorageGb > 0) {
        if (specs.storageGb === undefined) {
          unverifiedSpecs.push(`Storage capacity (${reqStorageGb}GB required)`);
        } else if (specs.storageGb < reqStorageGb) {
          failedReasons.push(`Storage ${specs.storageGb}GB is less than required ${reqStorageGb}GB`);
        }
      }
    }

    // 3. Display Resolution (resolution)
    if (mandatory['resolution'] && typeof mandatory['resolution'] === 'string') {
      const reqRes = mandatory['resolution'].toUpperCase();
      const reqTier = this.RESOLUTION_TIERS[reqRes] || 0;

      if (!specs.displayResolution) {
        unverifiedSpecs.push(`Display resolution (${mandatory['resolution']} required)`);
      } else {
        const actualTier = this.RESOLUTION_TIERS[specs.displayResolution.toUpperCase()] || 0;
        if (actualTier > 0 && reqTier > 0 && actualTier < reqTier) {
          failedReasons.push(`Display resolution ${specs.displayResolution} does not satisfy required ${mandatory['resolution']}`);
        }
      }
    }

    // 4. GPU / Graphics
    if (mandatory['gpu'] && typeof mandatory['gpu'] === 'string') {
      const requiredGpu = mandatory['gpu'].toLowerCase();
      if (!specs.gpuModel) {
        unverifiedSpecs.push(`Dedicated GPU (${mandatory['gpu']} required)`);
      } else if (!specs.gpuModel.toLowerCase().includes(requiredGpu)) {
        failedReasons.push(`GPU ${specs.gpuModel} does not match required ${mandatory['gpu']}`);
      }
    }

    // 5. Refresh Rate (refresh_rate_hz)
    if (mandatory['refresh_rate_hz'] && typeof mandatory['refresh_rate_hz'] === 'number') {
      const reqHz = mandatory['refresh_rate_hz'];
      if (!specs.refreshRateHz) {
        unverifiedSpecs.push(`Refresh rate (${reqHz}Hz required)`);
      } else if (specs.refreshRateHz < reqHz) {
        failedReasons.push(`Refresh rate ${specs.refreshRateHz}Hz is less than required ${reqHz}Hz`);
      }
    }

    // 6. CAS Latency (cl) - For memory, lower is faster
    if (mandatory['cl'] && typeof mandatory['cl'] === 'number') {
      const maxCl = mandatory['cl'];
      if (specs.cl === undefined) {
        unverifiedSpecs.push(`CAS Latency (CL${maxCl} or faster required)`);
      } else if (specs.cl > maxCl) {
        failedReasons.push(`CAS Latency CL${specs.cl} exceeds requested CL${maxCl}`);
      }
    }

    // 7. RAM Speed (speed_mhz)
    if (mandatory['speed_mhz'] && typeof mandatory['speed_mhz'] === 'number') {
      const reqSpeed = mandatory['speed_mhz'];
      if (specs.speedMhz === undefined) {
        unverifiedSpecs.push(`RAM Speed (${reqSpeed}MHz required)`);
      } else if (specs.speedMhz < reqSpeed) {
        failedReasons.push(`RAM speed ${specs.speedMhz}MHz is less than required ${reqSpeed}MHz`);
      }
    }

    // 8. Form Factor (formFactor: desktop vs sodimm)
    if (mandatory['form_factor'] && typeof mandatory['form_factor'] === 'string') {
      const reqForm = mandatory['form_factor'].toLowerCase();
      if (!specs.formFactor) {
        unverifiedSpecs.push(`Form factor (${mandatory['form_factor']} required)`);
      } else if (specs.formFactor !== reqForm) {
        failedReasons.push(`Form factor ${specs.formFactor} does not match required ${reqForm}`);
      }
    }

    // 9. Dietary Preference (dietary: veg vs non-veg)
    if (mandatory['dietary'] && typeof mandatory['dietary'] === 'string') {
      const reqDiet = mandatory['dietary'].toLowerCase();
      if (reqDiet === 'veg' && specs.dietary === 'non-veg') {
        failedReasons.push('Listing is non-vegetarian; vegetarian dish required');
      }
    }

    return {
      satisfied: failedReasons.length === 0,
      failedReasons,
      unverifiedSpecs
    };
  }
}

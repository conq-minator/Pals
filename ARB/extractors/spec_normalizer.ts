export interface NormalizedSpecifications {
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
  operatingSystem?: string;
  weightKg?: number;
  warrantyMonths: number;
  rawAttributes: Record<string, string>;
}

export class ARBSpecNormalizer {
  /**
   * Normalizes heterogeneous specification dictionaries or raw title strings into a standardized spec schema.
   */
  public static normalize(title: string, rawAttributes: Record<string, string> = {}): NormalizedSpecifications {
    const combined = `${title} ${Object.values(rawAttributes).join(' ')}`.toLowerCase();

    // 1. RAM normalization
    let ramGb: number | undefined;
    let ramType: string | undefined;
    const ramMatch = combined.match(/([0-9]{1,3})\s*(?:gb|gigabytes?)\s*(ddr[45]|lpddr[45]x?|unified)?/i);
    if (ramMatch) {
      ramGb = parseInt(ramMatch[1], 10);
      ramType = ramMatch[2]?.toUpperCase();
    }

    // 2. Storage normalization
    let storageGb: number | undefined;
    let storageType: string | undefined = 'SSD';
    const storageMatch = combined.match(/([0-9]{1,3})\s*(gb|tb)\s*(ssd|hdd|emmc|nvme|pcie)?/i);
    if (storageMatch) {
      const val = parseInt(storageMatch[1], 10);
      const unit = storageMatch[2].toUpperCase();
      storageGb = unit === 'TB' ? val * 1024 : val;
      storageType = storageMatch[3]?.toUpperCase() || 'SSD';
    }

    // 3. Display normalization
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
    } else if (combined.includes('1440p') || combined.includes('qhd') || combined.includes('2560x1440')) {
      displayResolution = '2K QHD';
    } else if (combined.includes('1080p') || combined.includes('fhd') || combined.includes('1920x1080')) {
      displayResolution = 'FHD';
    }

    // 4. Processor Normalization
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

    // 5. GPU Normalization
    let gpuModel: string | undefined;
    const gpuMatch = combined.match(/(rtx\s*[0-9]{4}(?:\s*ti)?|gtx\s*[0-9]{4}|radeon\s*rx\s*[0-9]{4}[a-z]*)/i);
    if (gpuMatch) {
      gpuModel = gpuMatch[1].toUpperCase();
    } else if (processorBrand === 'Apple Silicon') {
      gpuModel = `${processorModel || 'Apple'} Integrated GPU`;
    } else {
      gpuModel = 'Integrated Graphics';
    }

    // 6. Warranty
    let warrantyMonths = 12;
    const warrantyMatch = combined.match(/([0-9]{1,2})\s*(?:year|yr|month|mo)s?\s*warranty/i);
    if (warrantyMatch) {
      const num = parseInt(warrantyMatch[1], 10);
      warrantyMonths = combined.includes('year') || combined.includes('yr') ? num * 12 : num;
    }

    return {
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
      warrantyMonths,
      rawAttributes
    };
  }

  /**
   * Evaluates if normalized specs satisfy user-defined mandatory constraints.
   */
  public static satisfiesConstraints(
    specs: NormalizedSpecifications,
    mandatory: Record<string, string | number | boolean>
  ): { satisfied: boolean; failedReasons: string[] } {
    const failedReasons: string[] = [];

    if (mandatory['ram_gb'] && typeof mandatory['ram_gb'] === 'number') {
      if (!specs.ramGb || specs.ramGb < mandatory['ram_gb']) {
        failedReasons.push(`RAM ${specs.ramGb || 0}GB is less than required ${mandatory['ram_gb']}GB`);
      }
    }

    if (mandatory['refresh_rate_hz'] && typeof mandatory['refresh_rate_hz'] === 'number') {
      if (!specs.refreshRateHz || specs.refreshRateHz < mandatory['refresh_rate_hz']) {
        failedReasons.push(`Refresh rate ${specs.refreshRateHz || 60}Hz is less than required ${mandatory['refresh_rate_hz']}Hz`);
      }
    }

    if (mandatory['gpu'] && typeof mandatory['gpu'] === 'string') {
      const requiredGpu = mandatory['gpu'].toLowerCase();
      if (!specs.gpuModel || !specs.gpuModel.toLowerCase().includes(requiredGpu)) {
        failedReasons.push(`GPU ${specs.gpuModel || 'None'} does not match required ${mandatory['gpu']}`);
      }
    }

    return {
      satisfied: failedReasons.length === 0,
      failedReasons
    };
  }
}


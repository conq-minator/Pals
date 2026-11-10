import { ARBResearchPayload, MerchantListing } from '../../shared/types/index.js';

export interface ResearchTaskState {
  taskId: string;
  correlationId: string;
  productQuery: string;
  payload: ARBResearchPayload;
  qualifyingListings: MerchantListing[];
  scannedListingsCount: number;
  arbitrationSummary: string;
  updatedAt: string;
}

/**
 * ARBTaskStateStore
 * Maintains per-task research state enabling follow-up refinements
 * ("cheaper", "only veg", "same but 32GB", "skip Flipkart") without restarting from zero.
 */
export class ARBTaskStateStore {
  private static instance: ARBTaskStateStore;
  private states = new Map<string, ResearchTaskState>();

  public static getInstance(): ARBTaskStateStore {
    if (!ARBTaskStateStore.instance) {
      ARBTaskStateStore.instance = new ARBTaskStateStore();
    }
    return ARBTaskStateStore.instance;
  }

  public save(state: ResearchTaskState): void {
    this.states.set(state.taskId, {
      ...state,
      updatedAt: new Date().toISOString()
    });
  }

  public get(taskId: string): ResearchTaskState | undefined {
    return this.states.get(taskId);
  }

  public clear(): void {
    this.states.clear();
  }

  /**
   * Applies follow-up refinement prompt to an existing task payload.
   */
  public applyRefinement(taskId: string, refinementText: string): ARBResearchPayload {
    const existing = this.states.get(taskId);
    if (!existing) {
      throw new Error(`Task '${taskId}' not found for refinement`);
    }

    const payload = structuredClone(existing.payload);
    const lower = refinementText.toLowerCase().trim();

    // 1. "Cheaper" or Lower Budget
    if (lower.includes('cheaper') || lower.includes('lower price') || lower.includes('less expensive')) {
      if (existing.qualifyingListings.length > 0) {
        // Lower budget cap to 10% below the lowest found item, or 85% of previous budget
        const minLanded = existing.qualifyingListings[0].totalLandedCost;
        payload.budgetCeiling = Math.max(1, Math.round(minLanded * 0.9));
      } else {
        payload.budgetCeiling = Math.round(payload.budgetCeiling * 0.8);
      }
    } else {
      // Direct budget ceiling update (e.g. "under 60000" or "below 500")
      const numMatch = lower.match(/(?:under|below|max|upto)\s*([0-9,]+)/i);
      if (numMatch) {
        payload.budgetCeiling = parseFloat(numMatch[1].replace(/,/g, ''));
      }
    }

    // 2. Dietary Filter ("only veg", "vegetarian", "no chicken")
    if (lower.includes('only veg') || lower.includes('vegetarian') || lower.includes('pure veg')) {
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        dietary: 'veg'
      };
    } else if (lower.includes('non-veg') || lower.includes('chicken') || lower.includes('meat')) {
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        dietary: 'non-veg'
      };
    }

    // 3. Hardware Spec Updates (e.g. "same but 32GB", "with 1TB SSD")
    const ramMatch = lower.match(/([0-9]{1,3})\s*gb\s*(?:ram)?/i);
    if (ramMatch) {
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        ram_gb: parseInt(ramMatch[1], 10)
      };
    }

    const storageMatch = lower.match(/([0-9]{1,4})\s*(gb|tb)\s*(?:ssd|storage)?/i);
    if (storageMatch && !lower.includes('ram')) {
      const isTb = storageMatch[2].toUpperCase() === 'TB';
      const val = parseInt(storageMatch[1], 10);
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        storage: isTb ? `${val * 1024}GB` : `${val}GB`
      };
    }

    // 4. Merchant Inclusions / Exclusions ("skip Flipkart", "exclude Amazon", "only from Croma")
    const skipMatch = lower.match(/(?:skip|exclude|avoid|no)\s+([a-z0-9\s,]+)/i);
    if (skipMatch) {
      const skipTarget = skipMatch[1].toLowerCase();
      const currentTargets = typeof payload.mandatorySpecifications?.['target_merchants'] === 'string'
        ? (payload.mandatorySpecifications['target_merchants'] as string).split(',')
        : [];

      if (skipTarget.includes('flipkart')) {
        payload.mandatorySpecifications['target_merchants'] = currentTargets.filter(t => !t.includes('flipkart')).join(',');
        payload.excludedBrands = [...(payload.excludedBrands || []), 'flipkart'];
      }
      if (skipTarget.includes('amazon')) {
        payload.mandatorySpecifications['target_merchants'] = currentTargets.filter(t => !t.includes('amazon')).join(',');
      }
    }

    const onlyMatch = lower.match(/(?:only from|from|on)\s+([a-z0-9]+)/i);
    if (onlyMatch && !lower.includes('skip') && !lower.includes('avoid')) {
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        target_merchants: onlyMatch[1].toLowerCase()
      };
    }

    return payload;
  }
}

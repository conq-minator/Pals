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
  private static readonly TTL_MS = 60 * 60 * 1000; // 1-hour TTL
  private static readonly MAX_TASKS = 500;        // Max 500 tasks

  public static getInstance(): ARBTaskStateStore {
    if (!ARBTaskStateStore.instance) {
      ARBTaskStateStore.instance = new ARBTaskStateStore();
    }
    return ARBTaskStateStore.instance;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [id, state] of this.states.entries()) {
      if (now - new Date(state.updatedAt).getTime() > ARBTaskStateStore.TTL_MS) {
        this.states.delete(id);
      }
    }
  }

  public save(state: ResearchTaskState): void {
    this.pruneExpired();

    // If map is at capacity, evict oldest entry
    if (this.states.size >= ARBTaskStateStore.MAX_TASKS && !this.states.has(state.taskId)) {
      const oldestKey = this.states.keys().next().value;
      if (oldestKey) {
        this.states.delete(oldestKey);
      }
    }

    this.states.set(state.taskId, {
      ...state,
      updatedAt: state.updatedAt || new Date().toISOString()
    });
  }

  public get(taskId: string): ResearchTaskState | undefined {
    const state = this.states.get(taskId);
    if (!state) return undefined;

    if (Date.now() - new Date(state.updatedAt).getTime() > ARBTaskStateStore.TTL_MS) {
      this.states.delete(taskId);
      return undefined;
    }

    return state;
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
        // "Cheaper" = strictly cheaper than the option currently recommended (rank #1).
        // (Rank #1 is not always the cheapest, e.g. when a preferred brand is ranked first.)
        const topLanded = existing.qualifyingListings[0].totalLandedCost;
        const step = topLanded >= 100 ? 1 : 0.01;
        payload.budgetCeiling = Math.max(step, Math.round((topLanded - step) * 100) / 100);
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

    // Storage needs an explicit storage word or a TB unit; a bare "32gb" is RAM, not storage.
    const storageMatch = lower.match(/([0-9]{1,4})\s*(tb)\b/i) ||
                         lower.match(/([0-9]{1,4})\s*(gb)\s*(?:ssd|storage|hdd|nvme|rom)/i);
    if (storageMatch) {
      const isTb = storageMatch[2].toUpperCase() === 'TB';
      const val = parseInt(storageMatch[1], 10);
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        storage: isTb ? `${val * 1024}GB` : `${val}GB`
      };
    }

    // 4. Merchant Inclusions / Exclusions ("skip Flipkart", "exclude Amazon", "only from Croma")
    const skipMatch = lower.match(/(?:skip|exclude|avoid|without|not from|no)\s+([a-z0-9\s,&']+)/i);
    const isMerchantSkip = skipMatch && !/^(?:chicken|meat|egg|onion|garlic)/.test(skipMatch[1].trim());
    if (skipMatch && isMerchantSkip) {
      // Any merchant can be skipped: names are matched against merchant domain/name by the providers.
      const names = skipMatch[1]
        .split(/,|\band\b|&/)
        .map(n => n.replace(/['\s]/g, '').trim())
        .filter(n => n.length >= 3);

      const specs = { ...payload.mandatorySpecifications };
      const alreadyExcluded = typeof specs['excluded_merchants'] === 'string'
        ? (specs['excluded_merchants'] as string).split(',').filter(Boolean)
        : [];
      specs['excluded_merchants'] = Array.from(new Set([...alreadyExcluded, ...names])).join(',');

      // A merchant that is now skipped can no longer be a target
      if (typeof specs['target_merchants'] === 'string') {
        const remaining = (specs['target_merchants'] as string).split(',').filter(t => t && !names.some(n => t.includes(n)));
        if (remaining.length > 0) specs['target_merchants'] = remaining.join(',');
        else delete specs['target_merchants'];
      }
      payload.mandatorySpecifications = specs;
    }

    const onlyMatch = lower.match(/(?:only from|only on|from|on)\s+([a-z0-9']+(?:\s+hut)?)/i);
    if (onlyMatch && !skipMatch) {
      payload.mandatorySpecifications = {
        ...payload.mandatorySpecifications,
        target_merchants: onlyMatch[1].toLowerCase().replace(/['\s]/g, '')
      };
    }

    return payload;
  }
}

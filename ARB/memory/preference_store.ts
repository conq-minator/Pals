import { ARBResearchPayload } from '../../shared/types/index.js';

export interface UserPreferences {
  userId: string;
  dietary?: 'veg' | 'non-veg' | 'vegan' | 'halal' | 'kosher';
  preferredBrands?: string[];
  excludedBrands?: string[];
  defaultPincode?: string;
  defaultCurrency?: string;
  paymentMethodPreference?: 'PAYPAL' | 'UPI' | 'CREDIT_CARD';
  updatedAt: string;
}

/**
 * ARBPreferenceStore
 * Persistent in-memory user preference manager (Flaw 20).
 * Stores user preferences across tasks and enriches incoming queries with personalized defaults.
 */
export class ARBPreferenceStore {
  private static instance: ARBPreferenceStore;
  private store = new Map<string, UserPreferences>();
  private static readonly MAX_USERS = 1000;

  public static getInstance(): ARBPreferenceStore {
    if (!ARBPreferenceStore.instance) {
      ARBPreferenceStore.instance = new ARBPreferenceStore();
    }
    return ARBPreferenceStore.instance;
  }

  /**
   * Sets or merges preferences for a given user with LRU eviction.
   */
  public setPreferences(userId: string, prefs: Partial<Omit<UserPreferences, 'userId' | 'updatedAt'>>): UserPreferences {
    const existing = this.store.get(userId) || {
      userId,
      updatedAt: new Date().toISOString()
    };

    const updated: UserPreferences = {
      ...existing,
      ...prefs,
      userId,
      updatedAt: new Date().toISOString()
    };

    if (this.store.has(userId)) {
      this.store.delete(userId);
    } else if (this.store.size >= ARBPreferenceStore.MAX_USERS) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(userId, updated);
    return updated;
  }

  /**
   * Retrieves preferences for a user, updating LRU recency.
   */
  public getPreferences(userId: string): UserPreferences | undefined {
    const prefs = this.store.get(userId);
    if (!prefs) return undefined;

    // Refresh LRU position
    this.store.delete(userId);
    this.store.set(userId, prefs);
    return prefs;
  }

  /**
   * Automatically enriches a research payload with user preferences unless explicitly overridden.
   */
  public enrichPayload(userId: string, payload: ARBResearchPayload): ARBResearchPayload {
    const prefs = this.store.get(userId);
    if (!prefs) return payload;

    const enriched = structuredClone(payload);
    const queryLower = payload.productQuery.toLowerCase();

    // 1. Dietary Preference:
    // If user is vegetarian, apply 'veg' constraint unless prompt explicitly asks for meat/non-veg
    if (prefs.dietary) {
      const promptMentionsMeat = /(chicken|mutton|fish|beef|pork|non-veg|pepperoni|bacon)/i.test(queryLower);
      const hasExplicitDietary = enriched.mandatorySpecifications?.['dietary'] !== undefined;

      if (!promptMentionsMeat && !hasExplicitDietary) {
        enriched.mandatorySpecifications = {
          ...enriched.mandatorySpecifications,
          dietary: prefs.dietary
        };
      }
    }

    // 2. Preferred Brands
    if (prefs.preferredBrands && prefs.preferredBrands.length > 0) {
      const existing = enriched.preferredBrands || [];
      const combined = Array.from(new Set([...existing, ...prefs.preferredBrands]));
      enriched.preferredBrands = combined;
    }

    // 3. Excluded Brands
    if (prefs.excludedBrands && prefs.excludedBrands.length > 0) {
      const existing = enriched.excludedBrands || [];
      const combined = Array.from(new Set([...existing, ...prefs.excludedBrands]));
      enriched.excludedBrands = combined;
    }

    // 4. Default Postal Code (Pincode)
    if (prefs.defaultPincode && enriched.deliveryPostalCode === undefined) {
      enriched.deliveryPostalCode = prefs.defaultPincode;
    }

    return enriched;
  }

  public clear(): void {
    this.store.clear();
  }
}

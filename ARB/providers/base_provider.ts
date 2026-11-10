import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';

export interface IMerchantProvider {
  readonly providerId: string;
  readonly merchantName: string;
  readonly domain: string;

  /**
   * Searches the merchant catalog and returns matching listings.
   */
  search(payload: ARBResearchPayload): Promise<MerchantListing[]>;
}


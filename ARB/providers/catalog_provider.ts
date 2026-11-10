import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { IMerchantProvider } from './base_provider.js';
import { ARBAutonomousMarketAgent } from './agent_provider.js';

/**
 * MultiMerchantCatalogProvider
 * Replaced static hardcoded array catalogs with the autonomous ARB Market Intelligence Agent.
 * Searches across the open web, direct brand OEMs (Apple, Dell, Lenovo, HP, ASUS, Samsung, Sony),
 * national retailers (Amazon, Flipkart, Croma, Reliance, Vijay Sales), and global specialist stores
 * (B&H Photo, Best Buy, Walmart, Micro Center, Newegg, Meckeys, GenesisPC).
 */
export class MultiMerchantCatalogProvider {
  /**
   * Factory providing the active Autonomous Market Intelligence Agent.
   */
  public static createDefaultProviders(): IMerchantProvider[] {
    return [new ARBAutonomousMarketAgent()];
  }
}

export { ARBAutonomousMarketAgent };

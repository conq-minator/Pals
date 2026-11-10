import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { IMerchantProvider } from './base_provider.js';
import { ARBTrustScorer } from '../scoring/trust_scorer.js';
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';

export interface ProviderCatalogItem {
  sku: string;
  brand: string;
  title: string;
  basePrice: number;
  shipping: number;
  tax: number;
  url: string;
  inStock: boolean;
  warrantyMonths: number;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
}

export class MultiMerchantCatalogProvider implements IMerchantProvider {
  public readonly providerId: string;
  public readonly merchantName: string;
  public readonly domain: string;
  private catalog: ProviderCatalogItem[];

  constructor(
    providerId: string,
    merchantName: string,
    domain: string,
    catalog: ProviderCatalogItem[]
  ) {
    this.providerId = providerId;
    this.merchantName = merchantName;
    this.domain = domain;
    this.catalog = catalog;
  }

  public async search(payload: ARBResearchPayload): Promise<MerchantListing[]> {
    const { budgetCeiling, currency, productQuery, preferredBrands, excludedBrands, minMerchantTrustScore } = payload;
    const queryLower = productQuery.toLowerCase();

    // 1. Evaluate Merchant Trust
    const trust = ARBTrustScorer.evaluate(this.domain);
    if (trust.score < minMerchantTrustScore) {
      return []; // Discard merchant if below user's trust threshold
    }

    const results: MerchantListing[] = [];

    for (const item of this.catalog) {
      // Brand filter
      if (excludedBrands && excludedBrands.some(eb => eb.toLowerCase() === item.brand.toLowerCase())) {
        continue;
      }

      // Deal Arbitration (Vouchers / Promos)
      const deal = ARBDealArbitrator.arbitrateDeal(this.domain, item.basePrice, currency);
      const effectiveBasePrice = deal.discountedPrice;
      const totalLandedCost = effectiveBasePrice + item.shipping + item.tax;

      // Hard Budget Ceiling Invariant
      if (totalLandedCost > budgetCeiling) {
        continue;
      }

      results.push({
        merchantId: this.providerId,
        merchantName: this.merchantName,
        merchantDomain: this.domain,
        productTitle: item.title,
        productUrl: item.url,
        sku: item.sku,
        itemPrice: effectiveBasePrice,
        estimatedShipping: item.shipping,
        estimatedTax: item.tax,
        totalLandedCost,
        currency,
        inStock: item.inStock,
        warrantyPeriodMonths: item.warrantyMonths,
        trustScore: trust.score,
        trustReasons: trust.reasons,
        pros: deal.successful ? [...item.pros, deal.transparencyDescription] : item.pros,
        cons: item.cons
      });
    }

    return results;
  }

  /**
   * Factory providing realistic national multi-merchant catalogs.
   */
  public static createDefaultProviders(): IMerchantProvider[] {
    const amazon = new MultiMerchantCatalogProvider(
      'mch_amazon_in',
      'Amazon India (Authorized Retail)',
      'amazon.in',
      [
        {
          sku: 'AMZ-LNV-LOQ15',
          brand: 'Lenovo',
          title: 'Lenovo LOQ 15 Gaming Laptop (16GB DDR5, 512GB SSD, RTX 4050, 144Hz FHD)',
          basePrice: 69990,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B0CXEXAMPLE1',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 4050 6GB', display: '15.6" 144Hz FHD', processor: 'Intel Core i5-13450HX' },
          pros: ['High performance HX processor', 'Free next-day Prime delivery', 'Official Lenovo manufacturer warranty'],
          cons: ['Weighs 2.4kg with power brick']
        },
        {
          sku: 'AMZ-APL-MBA-M2',
          brand: 'Apple',
          title: 'Apple MacBook Air M2 (13.6-inch Liquid Retina, 8GB Unified Memory, 256GB SSD, Space Gray)',
          basePrice: 84900,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B0BEXAMPLE2',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '8GB Unified', gpu: 'Apple 8-core GPU', display: '13.6" Liquid Retina', processor: 'Apple M2' },
          pros: ['Exceptional 18-hour battery life', 'Ultralight 1.24kg build', 'Silent fanless operation'],
          cons: ['Base model has 8GB RAM and 256GB SSD']
        },
        {
          sku: 'AMZ-ASUS-VIVO16',
          brand: 'Asus',
          title: 'ASUS Vivobook 16X (16GB RAM, 512GB NVMe SSD, RTX 3050, 16" WUXGA 120Hz)',
          basePrice: 58990,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B0DEXAMPLE3',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR4', gpu: 'RTX 3050 4GB', display: '16" 120Hz WUXGA', processor: 'Intel Core i5-12450H' },
          pros: ['Large 16-inch 16:10 display', 'Generous 16GB dual-channel memory', 'Very affordable creator GPU'],
          cons: ['DDR4 generation RAM']
        },
        {
          sku: 'AMZ-SNY-WH1000XM5',
          brand: 'Sony',
          title: 'Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones (Black)',
          basePrice: 26990,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B09XS7JWHH',
          inStock: true,
          warrantyMonths: 12,
          specs: { battery: '30 Hours', anc: 'Auto NC Optimizer with 8 Mics', weight: '250g' },
          pros: ['Benchmark noise cancellation', 'Ultra-comfortable lightweight fit', 'Multipoint Bluetooth pairing'],
          cons: ['Does not fold as compactly as XM4']
        },
        {
          sku: 'AMZ-LG-27GN800',
          brand: 'LG',
          title: 'LG UltraGear 27-inch QHD IPS Gaming Monitor (144Hz, 1ms, G-Sync Compatible, HDR10)',
          basePrice: 22499,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B08LLD2C9L',
          inStock: true,
          warrantyMonths: 36,
          specs: { display: '27" QHD 2560x1440', refreshRate: '144Hz', panel: 'IPS 1ms', gsync: 'Yes' },
          pros: ['Crisp 1440p resolution', 'Vibrant IPS color accuracy', '3-year onsite warranty'],
          cons: ['Stand lacks height adjustability']
        },
        {
          sku: 'AMZ-KEY-K2V2',
          brand: 'Keychron',
          title: 'Keychron K2 Wireless Bluetooth/USB Mechanical Keyboard (Gateron G Pro Brown)',
          basePrice: 7999,
          shipping: 0,
          tax: 0,
          url: 'https://amazon.in/dp/B07YB32H52',
          inStock: true,
          warrantyMonths: 12,
          specs: { layout: '75% Compact', switches: 'Gateron Brown Tactile', battery: '4000mAh' },
          pros: ['Mac and Windows physical toggle', 'Huge 4000mAh battery', 'Hot-swappable tactile switches'],
          cons: ['Chassis profile is relatively tall']
        }
      ]
    );

    const croma = new MultiMerchantCatalogProvider(
      'mch_croma_in',
      'Croma Electronics (Tata Enterprise)',
      'croma.com',
      [
        {
          sku: 'CRM-LNV-IPSLIM5',
          brand: 'Lenovo',
          title: 'Lenovo IdeaPad Slim 5 (16GB LPDDR5X, 1TB SSD, Intel Core Ultra 5 125H, 14" OLED 120Hz)',
          basePrice: 74990,
          shipping: 0,
          tax: 0,
          url: 'https://croma.com/p/308912',
          inStock: true,
          warrantyMonths: 24,
          specs: { ram: '16GB LPDDR5X', gpu: 'Intel Arc Graphics', display: '14" 2.8K 120Hz OLED', processor: 'Intel Core Ultra 5 125H' },
          pros: ['Stunning 2.8K 120Hz OLED panel', 'Massive 1TB high-speed SSD', 'Includes Tata Croma 2-Year Extended Care'],
          cons: ['RAM is soldered to motherboard']
        },
        {
          sku: 'CRM-HP-VICTUS15',
          brand: 'HP',
          title: 'HP Victus 15 (16GB DDR5, 512GB Gen4 SSD, AMD Ryzen 5 7535HS, RTX 2050)',
          basePrice: 54990,
          shipping: 199,
          tax: 0,
          url: 'https://croma.com/p/304118',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 2050 4GB', display: '15.6" FHD 144Hz', processor: 'AMD Ryzen 5 7535HS' },
          pros: ['Competitive entry price', 'Fast DDR5 RAM', 'Available for same-day store pickup'],
          cons: ['Entry-level RTX 2050 GPU']
        },
        {
          sku: 'CRM-BOSE-QC45',
          brand: 'Bose',
          title: 'Bose QuietComfort 45 Bluetooth Wireless Noise Cancelling Headphones (Triple Black)',
          basePrice: 24900,
          shipping: 0,
          tax: 0,
          url: 'https://croma.com/p/244819',
          inStock: true,
          warrantyMonths: 12,
          specs: { battery: '24 Hours', anc: 'Quiet & Aware Modes', weight: '240g' },
          pros: ['Iconic Bose plush comfort', 'Physical control buttons', 'Legendary quiet mode ANC'],
          cons: ['Microphone pickup average in high wind']
        },
        {
          sku: 'CRM-DELL-XPS13',
          brand: 'Dell',
          title: 'Dell XPS 13 Plus 9320 (16GB LPDDR5, 512GB SSD, Intel Core i7-1360P, 13.4" FHD+ 500 nits)',
          basePrice: 114990,
          shipping: 0,
          tax: 0,
          url: 'https://croma.com/p/271892',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB LPDDR5', display: '13.4" FHD+ 500 nits InfinityEdge', processor: 'Intel Core i7-1360P' },
          pros: ['Invisible haptic glass touchpad', 'Zero-lattice edge-to-edge keyboard', 'Brilliant 500 nit display'],
          cons: ['Only 2 Thunderbolt ports, no headphone jack']
        }
      ]
    );

    const reliance = new MultiMerchantCatalogProvider(
      'mch_reliance_digital',
      'Reliance Digital',
      'reliancedigital.in',
      [
        {
          sku: 'RLD-ACER-NITROV',
          brand: 'Acer',
          title: 'Acer Nitro V 15 (16GB DDR5, 512GB SSD, Intel Core i5-13420H, RTX 4050 6GB, 144Hz)',
          basePrice: 68990,
          shipping: 0,
          tax: 0,
          url: 'https://reliancedigital.in/item/493821',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 4050 6GB (75W TGP)', display: '15.6" 144Hz FHD IPS', processor: 'Intel Core i5-13420H' },
          pros: ['Great price-to-performance RTX 4050', 'Thunderbolt 4 support', 'Reliable nationwide service'],
          cons: ['Display color gamut is 45% NTSC']
        },
        {
          sku: 'RLD-SMSG-ODYSSEY',
          brand: 'Samsung',
          title: 'Samsung Odyssey G5 27-inch WQHD Curved Gaming Monitor (165Hz, 1ms, HDR10)',
          basePrice: 21999,
          shipping: 0,
          tax: 0,
          url: 'https://reliancedigital.in/item/492102',
          inStock: true,
          warrantyMonths: 36,
          specs: { display: '27" WQHD Curved', refreshRate: '165Hz', responseTime: '1ms', hdr: 'HDR10' },
          pros: ['1000R deep curve immersion', 'Fast 165Hz refresh rate', '3-year manufacturer replacement warranty'],
          cons: ['VA panel viewing angles']
        },
        {
          sku: 'RLD-SNY-MOMENTUM4',
          brand: 'Sennheiser',
          title: 'Sennheiser Momentum 4 Wireless Noise-Cancelling Headphones (60-Hour Battery)',
          basePrice: 24990,
          shipping: 0,
          tax: 0,
          url: 'https://reliancedigital.in/item/491901',
          inStock: true,
          warrantyMonths: 24,
          specs: { batteryLife: '60 Hours', audioCodec: 'aptX Adaptive', anc: 'Adaptive Noise Cancellation' },
          pros: ['Class-leading 60-hour battery life', 'Audiophile sound tuning', '2-year warranty'],
          cons: ['Touch controls sensitive to accidental touches']
        }
      ]
    );

    const flipkart = new MultiMerchantCatalogProvider(
      'mch_flipkart_in',
      'Flipkart Official',
      'flipkart.com',
      [
        {
          sku: 'FLP-ACER-PRED',
          brand: 'Acer',
          title: 'Acer Predator Helios Neo 16 (16GB RAM, 1TB SSD, RTX 4060, 165Hz WQXGA)',
          basePrice: 99990,
          shipping: 0,
          tax: 0,
          url: 'https://flipkart.com/item/FLPACERPRED1',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 4060 8GB (140W)', display: '16" 165Hz WQXGA 100% sRGB', processor: 'Intel Core i7-13700HX' },
          pros: ['Full-power 140W RTX 4060', 'Superb 100% sRGB display', 'Liquid metal cooling'],
          cons: ['Heavy chassis']
        },
        {
          sku: 'FLP-MSI-THIN15',
          brand: 'MSI',
          title: 'MSI Thin 15 (16GB RAM, 512GB SSD, RTX 3050, 144Hz FHD)',
          basePrice: 51990,
          shipping: 99,
          tax: 0,
          url: 'https://flipkart.com/item/FLPMSITHIN1',
          inStock: true,
          warrantyMonths: 24,
          specs: { ram: '16GB DDR4', gpu: 'RTX 3050 4GB', display: '15.6" 144Hz FHD', processor: 'Intel Core i5-12450H' },
          pros: ['Budget-friendly entry gamer', 'Lightweight 1.86kg build'],
          cons: ['Single fan cooling system']
        },
        {
          sku: 'FLP-RAZER-DEATHADDER',
          brand: 'Razer',
          title: 'Razer DeathAdder V3 Pro Wireless Ergonomic Esports Gaming Mouse',
          basePrice: 12499,
          shipping: 0,
          tax: 0,
          url: 'https://flipkart.com/item/FLPRAZERDA3',
          inStock: true,
          warrantyMonths: 24,
          specs: { sensor: 'Focus Pro 30K Optical', weight: '63g', battery: '90 Hours' },
          pros: ['Ultra-lightweight 63g', 'Flawless 30K optical sensor', 'Gen-3 optical switches'],
          cons: ['Premium price tag for mouse']
        }
      ]
    );

    const walmart = new MultiMerchantCatalogProvider(
      'mch_walmart_us',
      'Walmart Official (US / Global)',
      'walmart.com',
      [
        {
          sku: 'WMT-HP-PAVPLUS14',
          brand: 'HP',
          title: 'HP Pavilion Plus 14 Laptop (16GB LPDDR5x, 512GB SSD, Intel Core Ultra 5 125H, 2.8K OLED)',
          basePrice: 749,
          shipping: 0,
          tax: 0,
          url: 'https://walmart.com/ip/HP-Pavilion-Plus-14/198231',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB LPDDR5x', gpu: 'Intel Arc Graphics', display: '14" 2.8K OLED 120Hz', processor: 'Intel Core Ultra 5' },
          pros: ['Sub-$800 OLED powerhouse', 'All-metal aluminum chassis', 'Free 2-day shipping'],
          cons: ['Glossy screen reflects glare']
        },
        {
          sku: 'WMT-LNV-LEGION5',
          brand: 'Lenovo',
          title: 'Lenovo Legion 5 15.6" Gaming Laptop (16GB DDR5, 512GB SSD, RTX 4060, AMD Ryzen 7 7735HS)',
          basePrice: 899,
          shipping: 0,
          tax: 0,
          url: 'https://walmart.com/ip/Lenovo-Legion-5-Gaming/291823',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 4060 8GB', display: '15.6" 165Hz FHD', processor: 'AMD Ryzen 7 7735HS' },
          pros: ['Class-leading Legion thermals', 'TrueStrike keyboard', 'Great sub-$900 value'],
          cons: ['Bulky 230W charger']
        },
        {
          sku: 'WMT-DELL-INSP16',
          brand: 'Dell',
          title: 'Dell Inspiron 16 5630 (16GB LPDDR5, 1TB SSD, Intel Core i7-1360P, 16" FHD+ 16:10)',
          basePrice: 849,
          shipping: 0,
          tax: 0,
          url: 'https://walmart.com/ip/Dell-Inspiron-16/391024',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB LPDDR5', gpu: 'Intel Iris Xe', display: '16" FHD+ 16:10 ComfortView', processor: 'Intel Core i7-1360P' },
          pros: ['Spacious 16-inch productivity screen', '1TB NVMe storage', 'Thunderbolt 4 support'],
          cons: ['Integrated GPU not for heavy 3D gaming']
        }
      ]
    );

    const bestbuy = new MultiMerchantCatalogProvider(
      'mch_bestbuy_us',
      'Best Buy Official',
      'bestbuy.com',
      [
        {
          sku: 'BBY-ASUS-TUF15',
          brand: 'Asus',
          title: 'ASUS TUF Gaming A15 15.6" FHD 144Hz (16GB DDR5, 512GB SSD, RTX 4050, Ryzen 5 7535HS)',
          basePrice: 799,
          shipping: 0,
          tax: 0,
          url: 'https://bestbuy.com/site/asus-tuf-gaming-a15/6570270.p',
          inStock: true,
          warrantyMonths: 12,
          specs: { ram: '16GB DDR5', gpu: 'RTX 4050 6GB', display: '15.6" 144Hz FHD', processor: 'AMD Ryzen 5 7535HS' },
          pros: ['Military-grade MIL-STD-810H durability', 'Upgradable dual RAM slots', 'Curbside store pickup'],
          cons: ['Plastic touchpad']
        },
        {
          sku: 'BBY-LOGI-MX3S',
          brand: 'Logitech',
          title: 'Logitech MX Master 3S Wireless Performance Mouse (8K DPI, Quiet Clicks)',
          basePrice: 99,
          shipping: 0,
          tax: 0,
          url: 'https://bestbuy.com/site/logitech-mx-master-3s/6503021.p',
          inStock: true,
          warrantyMonths: 12,
          specs: { dpi: '8000 DPI Darkfield', connectivity: 'Bluetooth / Logi Bolt', battery: '70 Days' },
          pros: ['MagSpeed electromagnetic scroll wheel', 'Tracks on glass surfaces', 'Ergonomic palm support'],
          cons: ['Right-handed only design']
        }
      ]
    );

    return [amazon, croma, reliance, flipkart, walmart, bestbuy];
  }
}


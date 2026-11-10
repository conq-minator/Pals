import { PalsLogger } from '../../shared/logging/index.js';

export interface VerifiedProductPage {
  url: string;
  title: string;
  price: number;
  currency: string;
  mrp?: number;
  inStock: boolean;
  seller?: string;
  brand?: string;
  model?: string;
  sku?: string;
  gtin?: string;
  extractedVia: 'json-ld' | 'opengraph' | 'meta' | 'fallback_snippet';
  verifiedAt: string;
}

interface CacheRecord {
  data: VerifiedProductPage;
  expiresAt: number;
}

/**
 * ARBProductVerifier
 * Two-stage product verifier that inspects candidate product pages,
 * extracts authentic structured schema.org JSON-LD and OpenGraph metadata,
 * validates in-stock status, and discards misleading EMI/accessory prices.
 *
 * Implements category-aware TTL caching to avoid redundant network overhead:
 * - Food & Groceries: 5 minutes
 * - Electronics & PC Hardware: 2 hours
 * - General Retail: 30 minutes
 */
export class ARBProductVerifier {
  private static logger = new PalsLogger('ARB:ProductVerifier');
  private static cache = new Map<string, CacheRecord>();

  private static readonly TTL_FOOD_GROCERY_MS = 5 * 60 * 1000;      // 5 min
  private static readonly TTL_ELECTRONICS_MS = 2 * 60 * 60 * 1000;   // 2 hours
  private static readonly TTL_DEFAULT_MS = 30 * 60 * 1000;          // 30 min

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  ];

  /**
   * Clears the in-memory verification cache (primarily for tests).
   */
  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Retrieves cached verification if available and not expired.
   */
  public static getCached(url: string): VerifiedProductPage | null {
    const key = this.normalizeUrlKey(url);
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  /**
   * Stores a verified product record into the cache with category-appropriate TTL.
   */
  public static setCache(url: string, data: VerifiedProductPage, category?: string): void {
    const key = this.normalizeUrlKey(url);
    const ttl = this.resolveTTL(category, url);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Normalizes URLs for cache lookup (removes tracking queries like utm_*, ref_*, uddg).
   */
  public static normalizeUrlKey(url: string): string {
    try {
      const u = new URL(url);
      const searchParams = new URLSearchParams(u.search);
      for (const key of Array.from(searchParams.keys())) {
        if (key.startsWith('utm_') || key.startsWith('ref') || key === 'tag' || key === 'ascsubtag') {
          searchParams.delete(key);
        }
      }
      u.search = searchParams.toString();
      u.hash = '';
      return u.toString().toLowerCase();
    } catch {
      return url.toLowerCase().trim();
    }
  }

  /**
   * Determines TTL duration based on category and URL patterns.
   */
  public static resolveTTL(category?: string, url?: string): number {
    const text = `${category || ''} ${url || ''}`.toLowerCase();
    if (text.includes('swiggy') || text.includes('zomato') || text.includes('blinkit') ||
        text.includes('zepto') || text.includes('food') || text.includes('grocery') ||
        text.includes('milk') || text.includes('bread') || text.includes('egg')) {
      return this.TTL_FOOD_GROCERY_MS;
    }
    if (text.includes('laptop') || text.includes('ram') || text.includes('ddr5') ||
        text.includes('gpu') || text.includes('mac') || text.includes('croma') ||
        text.includes('amazon') || text.includes('reliancedigital') || text.includes('mdcomputers')) {
      return this.TTL_ELECTRONICS_MS;
    }
    return this.TTL_DEFAULT_MS;
  }

  /**
   * Parses raw HTML string and extracts structured schema.org JSON-LD or OpenGraph Product/Offer data.
   */
  public static extractFromHtml(html: string, pageUrl: string = ''): VerifiedProductPage | null {
    if (!html || typeof html !== 'string') return null;

    // 1. Try schema.org JSON-LD extraction
    const jsonLdResult = this.extractFromJsonLd(html, pageUrl);
    if (jsonLdResult && jsonLdResult.price > 0) {
      return jsonLdResult;
    }

    // 2. Try OpenGraph & HTML Meta tag extraction
    const metaResult = this.extractFromMetaTags(html, pageUrl);
    if (metaResult && metaResult.price > 0) {
      return metaResult;
    }

    return null;
  }

  /**
   * Extracts Product and Offer data from <script type="application/ld+json"> blocks.
   */
  private static extractFromJsonLd(html: string, pageUrl: string): VerifiedProductPage | null {
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(html)) !== null) {
      const rawJson = match[1].trim();
      if (!rawJson) continue;

      try {
        const parsed = JSON.parse(rawJson);
        const productObj = this.findProductObject(parsed);
        if (!productObj) continue;

        const title = typeof productObj.name === 'string' ? productObj.name.trim() : '';
        const brand = typeof productObj.brand === 'string'
          ? productObj.brand
          : (productObj.brand && typeof productObj.brand.name === 'string' ? productObj.brand.name : undefined);
        const model = typeof productObj.model === 'string'
          ? productObj.model
          : (productObj.model && typeof productObj.model.name === 'string' ? productObj.model.name : undefined);
        const sku = typeof productObj.sku === 'string' ? productObj.sku : undefined;
        const gtin = typeof productObj.gtin13 === 'string' ? productObj.gtin13 : (typeof productObj.gtin === 'string' ? productObj.gtin : undefined);

        // Resolve offers
        const offers = productObj.offers;
        let selectedOffer: any = null;

        if (Array.isArray(offers) && offers.length > 0) {
          selectedOffer = offers[0];
        } else if (offers && typeof offers === 'object') {
          selectedOffer = offers;
        }

        if (!selectedOffer) continue;

        let rawPrice = selectedOffer.price ?? selectedOffer.lowPrice;
        if (typeof rawPrice === 'string') {
          rawPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
        }
        if (typeof rawPrice !== 'number' || isNaN(rawPrice) || rawPrice <= 0) continue;

        // Discard suspect EMI prices (e.g. if offer text mentions EMI/monthly installments)
        const offerText = JSON.stringify(selectedOffer).toLowerCase();
        if (offerText.includes('/month') || offerText.includes('monthly payment') || offerText.includes('emi ')) {
          // If the price is unrealistically low for high value product, flag or ignore
          if (rawPrice < 500 && (title.toLowerCase().includes('laptop') || title.toLowerCase().includes('mac mini'))) {
            continue;
          }
        }

        const currency = (selectedOffer.priceCurrency || 'INR').toUpperCase();
        let inStock = true;
        if (typeof selectedOffer.availability === 'string') {
          const avail = selectedOffer.availability.toLowerCase();
          if (avail.includes('outofstock') || avail.includes('soldout') || avail.includes('discontinued')) {
            inStock = false;
          }
        }

        const seller = selectedOffer.seller && typeof selectedOffer.seller.name === 'string'
          ? selectedOffer.seller.name
          : undefined;

        let mrp: number | undefined;
        if (selectedOffer.highPrice && typeof selectedOffer.highPrice === 'number' && selectedOffer.highPrice > rawPrice) {
          mrp = selectedOffer.highPrice;
        }

        return {
          url: pageUrl,
          title: this.cleanProductTitle(title),
          price: rawPrice,
          currency,
          mrp,
          inStock,
          seller,
          brand,
          model,
          sku,
          gtin,
          extractedVia: 'json-ld',
          verifiedAt: new Date().toISOString()
        };
      } catch {
        // Continue to next script block on parse failure
      }
    }

    return null;
  }

  /**
   * Traverses arbitrary JSON-LD object or array looking for an object with @type Product.
   */
  private static findProductObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return null;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = this.findProductObject(item);
        if (found) return found;
      }
      return null;
    }

    const type = obj['@type'];
    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
      return obj;
    }

    if (Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        const found = this.findProductObject(item);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Extracts Product data from OpenGraph, Twitter card, and standard HTML meta tags.
   */
  private static extractFromMetaTags(html: string, pageUrl: string): VerifiedProductPage | null {
    // 1. Price
    const pricePatterns = [
      /<meta\s+property=["'](?:og:price:amount|product:price:amount)["']\s+content=["']([0-9.,]+)["']/i,
      /<meta\s+content=["']([0-9.,]+)["']\s+property=["'](?:og:price:amount|product:price:amount)["']/i,
      /<meta\s+name=["']twitter:data1["']\s+content=["'](?:₹|\$|rs\.?)?\s*([0-9.,]+)["']/i
    ];

    let extractedPrice = 0;
    for (const pat of pricePatterns) {
      const match = html.match(pat);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          extractedPrice = parsed;
          break;
        }
      }
    }

    if (extractedPrice <= 0) return null;

    // 2. Currency
    const currencyPatterns = [
      /<meta\s+property=["'](?:og:price:currency|product:price:currency)["']\s+content=["']([A-Z]{3})["']/i,
      /<meta\s+content=["']([A-Z]{3})["']\s+property=["'](?:og:price:currency|product:price:currency)["']/i
    ];
    let currency = 'INR';
    for (const pat of currencyPatterns) {
      const match = html.match(pat);
      if (match) {
        currency = match[1].toUpperCase();
        break;
      }
    }

    // 3. Title
    const titlePatterns = [
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
      /<title>([\s\S]*?)<\/title>/i
    ];
    let rawTitle = '';
    for (const pat of titlePatterns) {
      const match = html.match(pat);
      if (match) {
        rawTitle = match[1].replace(/<[^>]+>/g, '').trim();
        break;
      }
    }
    if (!rawTitle) return null;

    // 4. Availability
    let inStock = true;
    const availMatch = html.match(/<meta\s+property=["'](?:og:availability|product:availability)["']\s+content=["']([^"']+)["']/i);
    if (availMatch) {
      const avail = availMatch[1].toLowerCase();
      if (avail.includes('oos') || avail.includes('out of stock') || avail.includes('sold_out')) {
        inStock = false;
      }
    }

    return {
      url: pageUrl,
      title: this.cleanProductTitle(rawTitle),
      price: extractedPrice,
      currency,
      inStock,
      extractedVia: 'opengraph',
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Cleans title of repetitive merchant tags (e.g. "Buy ... online at Amazon.in").
   */
  private static cleanProductTitle(rawTitle: string): string {
    return rawTitle
      .replace(/\s*[-|:]\s*(?:Amazon\.in|Flipkart|Croma|Reliance Digital|Walmart|Best Buy|MD Computers)[\s\S]*$/i, '')
      .replace(/^Buy\s+/i, '')
      .replace(/\s+online at best price.*$/i, '')
      .trim();
  }

  /**
   * Performs an asynchronous HTTP GET request to verify a live product page,
   * with strict abort timeout and user-agent rotation.
   */
  public static async fetchAndVerify(
    url: string,
    timeoutMs: number = 2500,
    category?: string
  ): Promise<VerifiedProductPage | null> {
    // 1. Check cache first
    const cached = this.getCached(url);
    if (cached) {
      return cached;
    }

    // 2. Fetch page with timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) return null;
      const html = await response.text();

      const verified = this.extractFromHtml(html, url);
      if (verified) {
        this.setCache(url, verified, category);
        return verified;
      }
    } catch {
      // Fetch aborted or network blocked; handled gracefully
    }

    return null;
  }
}

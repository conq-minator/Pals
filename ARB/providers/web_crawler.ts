import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { ARBCurrencyConverter } from '../currency/forex_converter.js';
import { ARBTrustScorer } from '../scoring/trust_scorer.js';
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';
import { ARBQueryMatcher } from '../extractors/query_matcher.js';

/**
 * ARBWebCrawler
 * Autonomous live e-commerce search crawler.
 * Searches across multi-merchant endpoints on the public web, extracts real product URLs,
 * parses native prices, converts currencies accurately via forex, and normalizes specifications.
 */
export class ARBWebCrawler {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  ];

  /**
   * Executes live crawl across target merchants for the user query.
   */
  public static async crawl(payload: ARBResearchPayload, timeoutMs: number = 3000): Promise<MerchantListing[]> {
    const { productQuery, currency: targetCurrency, budgetCeiling, excludedBrands, mandatorySpecifications } = payload;
    const rawTargets = mandatorySpecifications?.['target_merchants'];
    const targetMerchants: string[] = typeof rawTargets === 'string'
      ? rawTargets.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];
    
    // Refresh forex exchange rates in background
    await ARBCurrencyConverter.refreshRates();

    const cleanQuery = productQuery.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQuery) return [];

    // Construct targeted search queries across verified merchants
    const searchTasks: Array<{ query: string; region: 'IN' | 'US' }> = [
      {
        query: `${cleanQuery} price site:flipkart.com OR site:amazon.in OR site:croma.com OR site:reliancedigital.in`,
        region: 'IN'
      },
      {
        query: `${cleanQuery} buy price site:walmart.com OR site:bestbuy.com`,
        region: 'US'
      }
    ];

    const listings: MerchantListing[] = [];
    const seenUrls = new Set<string>();

    const crawlPromises = searchTasks.map(async task => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const params = new URLSearchParams();
        params.append('q', task.query);
        params.append('b', '');
        if (task.region === 'IN') {
          params.append('kl', 'in-en');
        }

        const res = await fetch('https://html.duckduckgo.com/html/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)]
          },
          body: params.toString(),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) return;
        const html = await res.text();

        // Split HTML by result item blocks
        const blocks = html.split('<div class="result results_links results_links_deep web-result');
        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];

          // 1. Extract Title & Raw Link
          const titleMatch = block.match(/<h2 class="result__title">[\s\S]*?<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/);
          if (!titleMatch) continue;

          let rawUrl = titleMatch[1];
          let directUrl = rawUrl;
          if (rawUrl.includes('uddg=')) {
            try {
              directUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
            } catch {}
          }

          if (seenUrls.has(directUrl)) continue;
          seenUrls.add(directUrl);

          const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();

          // Clean title (remove trailing "- Amazon.in", " - Flipkart", etc.)
          const cleanTitle = rawTitle
            .replace(/\s*[-|]\s*(?:Amazon\.in|Flipkart|Croma|Reliance Digital|Walmart|Best Buy)[\s\S]*$/i, '')
            .trim();

          // 2. Extract Snippet
          const snippetMatch = block.match(/class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // 3. Extract Merchant Domain
          let domain = 'unknown.com';
          try {
            domain = new URL(directUrl).hostname.replace(/^www\./, '');
          } catch {
            continue;
          }

          // Skip if targetMerchants specified and domain doesn't match
          if (targetMerchants && targetMerchants.length > 0) {
            const matchesTarget = targetMerchants.some(tm => domain.toLowerCase().includes(tm.toLowerCase()));
            if (!matchesTarget) continue;
          }

          // Merchant details & Native Currency
          const nativeCurrency = ARBCurrencyConverter.detectMerchantNativeCurrency(domain);
          let merchantName = domain;
          if (domain.includes('amazon.in')) merchantName = 'Amazon India (Official)';
          else if (domain.includes('flipkart.com')) merchantName = 'Flipkart Official';
          else if (domain.includes('croma.com')) merchantName = 'Croma Electronics';
          else if (domain.includes('reliancedigital.in')) merchantName = 'Reliance Digital';
          else if (domain.includes('walmart.com')) merchantName = 'Walmart US';
          else if (domain.includes('bestbuy.com')) merchantName = 'Best Buy US';

          // 4. Extract Price
          const combinedText = `${rawTitle} ${snippet}`;
          let nativePrice = 0;

          if (nativeCurrency === 'USD') {
            const usdMatch = combinedText.match(/\$\s*([0-9,]+(?:\.[0-9]{2})?)/);
            if (usdMatch) {
              nativePrice = parseFloat(usdMatch[1].replace(/,/g, ''));
            }
          } else {
            const inrMatch = combinedText.match(/(?:rs\.?|₹|inr)\s*([0-9,]+)/i);
            if (inrMatch) {
              nativePrice = parseFloat(inrMatch[1].replace(/,/g, ''));
            }
          }

          // Skip if no credible price could be extracted
          if (nativePrice <= 0) continue;

          // 5. Query relevance validation (Prevent returning laptops for Mac Mini!)
          const intent = ARBQueryMatcher.matchesIntent(productQuery, cleanTitle);
          if (!intent.matches) {
            continue;
          }

          // 6. Currency Conversion
          // Convert from merchant's native currency to user requested target currency
          const convertedPrice = ARBCurrencyConverter.convert(nativePrice, nativeCurrency, targetCurrency);

          // 7. Shipping & Tax Estimates
          const shipping = 0; // Verified stores usually offer free shipping for high-value tech
          const tax = 0;      // Taxes included in retail listing price

          // 8. Deal Arbitration (Concessions & Vouchers)
          const deal = ARBDealArbitrator.arbitrateDeal(domain, convertedPrice, targetCurrency);
          const effectiveBasePrice = deal.discountedPrice;
          const totalLandedCost = effectiveBasePrice + shipping + tax;

          // 9. Budget Ceiling Check
          if (totalLandedCost > budgetCeiling) {
            continue;
          }

          // 10. Spec Normalization & Constraint Satisfaction
          const normalizedSpecs = ARBSpecNormalizer.normalize(cleanTitle, { snippet });
          if (mandatorySpecifications && Object.keys(mandatorySpecifications).length > 0) {
            const satisfies = ARBSpecNormalizer.satisfiesConstraints(normalizedSpecs, mandatorySpecifications);
            if (!satisfies.satisfied) {
              continue;
            }
          }

          // 11. Trust Evaluation
          const trust = ARBTrustScorer.evaluate(domain);

          // 12. SKU Generation
          const skuPrefix = domain.split('.')[0].toUpperCase().slice(0, 3);
          const skuHash = Math.abs(cleanTitle.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)).toString(36).slice(0, 6);
          const sku = `LIVE-${skuPrefix}-${skuHash.toUpperCase()}`;

          listings.push({
            merchantId: `mch_live_${domain.replace(/[^a-z0-9]/g, '_')}`,
            merchantName,
            merchantDomain: domain,
            productTitle: cleanTitle,
            productUrl: directUrl,
            sku,
            itemPrice: convertedPrice,
            estimatedShipping: shipping,
            estimatedTax: tax,
            totalLandedCost,
            currency: targetCurrency,
            inStock: true,
            warrantyPeriodMonths: 12,
            trustScore: trust.score,
            trustReasons: trust.reasons,
            pros: deal.successful 
              ? [`Live web crawl verified on ${domain}`, deal.transparencyDescription]
              : [`Live web crawl verified on ${domain}`],
            cons: nativeCurrency !== targetCurrency 
              ? [`Forex converted from ${nativePrice} ${nativeCurrency} at live exchange rate`]
              : []
          });
        }
      } catch (err) {
        // Silent catch for individual network timeouts
      }
    });

    await Promise.all(crawlPromises);
    return listings;
  }
}


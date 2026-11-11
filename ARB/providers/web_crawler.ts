import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { ARBCurrencyConverter } from '../currency/forex_converter.js';
import { ARBTrustScorer } from '../scoring/trust_scorer.js';
import { ARBDealArbitrator } from '../negotiation/deal_arbitrator.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';
import { ARBQueryMatcher } from '../extractors/query_matcher.js';
import { ARBProductVerifier } from './product_verifier.js';
import { ARBCanonicalIdentity } from '../extractors/canonical_product.js';
import { ARBLandedCostCalculator } from '../pricing/landed_cost.js';

/**
 * ARBWebCrawler
 * Two-stage autonomous live e-commerce search crawler & product verifier.
 *
 * Stage 1 (Discover): Searches multi-merchant indexes for candidate product URLs.
 * Stage 2 (Verify): Inspects candidate product pages, extracts authentic schema.org
 * JSON-LD / OpenGraph data, filters false EMI rates, computes real landed costs
 * (including shipping thresholds, packaging, platform fees, and pincode rules),
 * and assigns canonical product identities.
 */
export class ARBWebCrawler {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  ];

  /**
   * Executes two-stage live crawl & verification across target merchants.
   */
  public static async crawl(payload: ARBResearchPayload, timeoutMs: number = 3000): Promise<MerchantListing[]> {
    const {
      productQuery,
      currency: targetCurrency,
      budgetCeiling,
      excludedBrands,
      mandatorySpecifications,
      deliveryPostalCode,
      category
    } = payload;

    const rawTargets = mandatorySpecifications?.['target_merchants'];
    const targetMerchants: string[] = typeof rawTargets === 'string'
      ? rawTargets.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];
    
    // Refresh forex exchange rates in background
    await ARBCurrencyConverter.refreshRates();

    const cleanQuery = productQuery.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQuery) return [];

    // Stage 1: Candidate Discovery tasks across verified merchant domains
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

        // Split HTML by candidate result item blocks
        const blocks = html.split('<div class="result results_links results_links_deep web-result');
        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];

          // 1. Extract Candidate Title & Direct Link
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

          // Filter by target merchants if requested
          if (targetMerchants && targetMerchants.length > 0) {
            const matchesTarget = targetMerchants.some(tm => domain.toLowerCase().includes(tm.toLowerCase()));
            if (!matchesTarget) continue;
          }

          const nativeCurrency = ARBCurrencyConverter.detectMerchantNativeCurrency(domain);
          let merchantName = domain;
          if (domain.includes('amazon.in')) merchantName = 'Amazon India (Official)';
          else if (domain.includes('flipkart.com')) merchantName = 'Flipkart Official';
          else if (domain.includes('croma.com')) merchantName = 'Croma Electronics';
          else if (domain.includes('reliancedigital.in')) merchantName = 'Reliance Digital';
          else if (domain.includes('walmart.com')) merchantName = 'Walmart US';
          else if (domain.includes('bestbuy.com')) merchantName = 'Best Buy US';

          // =================================================================
          // STAGE 2: Product Page Verification (JSON-LD & OpenGraph)
          // =================================================================
          let verifiedPage = await ARBProductVerifier.fetchAndVerify(
            directUrl,
            Math.min(timeoutMs, 2500),
            category
          );

          let finalTitle = cleanTitle;
          let nativePrice = 0;
          let inStock = true;
          let isVerified = false;

          if (verifiedPage && verifiedPage.price > 0) {
            finalTitle = verifiedPage.title || cleanTitle;
            nativePrice = verifiedPage.price;
            inStock = verifiedPage.inStock;
            if (verifiedPage.seller) merchantName = `${verifiedPage.seller} (via ${domain})`;
            isVerified = true;
          } else {
            // Fallback: snippet extraction with strict anti-EMI filtering
            const combinedText = `${rawTitle} ${snippet}`;

            // Reject if snippet text is explicitly an EMI quote
            const looksLikeEmiQuote = /emi from|emi starts|no cost emi|\/month|per month/i.test(combinedText) && !combinedText.includes('full price');

            if (looksLikeEmiQuote) {
              // An unverified snippet that quotes a monthly instalment cannot be trusted as the item price.
              nativePrice = 0;
            } else if (nativeCurrency === 'USD') {
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
          }

          // Discard if no credible price could be resolved
          if (nativePrice <= 0) continue;

          // 4. Query Intent Validation
          const intent = ARBQueryMatcher.matchesIntent(productQuery, finalTitle);
          if (!intent.matches) continue;

          // 5. Currency Conversion
          const quantity = Math.max(1, payload.quantity ?? 1);
          const convertedPrice = ARBCurrencyConverter.convert(nativePrice * quantity, nativeCurrency, targetCurrency);

          // 6. Deal Arbitration (Public Vouchers)
          const deal = ARBDealArbitrator.arbitrateDeal(domain, convertedPrice, targetCurrency);

          // 7. Authentic Landed Cost Calculation (Shipping thresholds, packaging, platform fees, taxes, pincode)
          const landedCalc = ARBLandedCostCalculator.calculate({
            merchantDomain: domain,
            itemPrice: convertedPrice,
            currency: targetCurrency,
            productTitle: finalTitle,
            category,
            deliveryPostalCode,
            discountAmount: deal.successful ? deal.savingsAmount : 0,
            crossBorder: nativeCurrency !== targetCurrency
          });

          // Discard if postal code is incompatible/unserviced
          if (!landedCalc.pincodeServiced) continue;

          const totalLandedCost = landedCalc.totalLandedCost;

          // 8-9. Budget and spec filtering are owned by the agent loop (it needs the
          //      near-misses to propose closest alternatives), so they are not applied here.
          const normalizedSpecs = ARBSpecNormalizer.normalize(finalTitle, { snippet });

          // 10. Canonical Product Identity
          const canonicalIdentity = ARBCanonicalIdentity.extractIdentity(
            finalTitle,
            verifiedPage?.brand,
            normalizedSpecs,
            directUrl
          );

          // 11. Trust Evaluation
          const trust = ARBTrustScorer.evaluate(domain);

          // 12. Structured Pros & Cons with Transparency
          const pros: string[] = isVerified
            ? [`Verified live with merchant schema.org data on ${domain}`]
            : [`Candidate discovered via live web crawl on ${domain}`];

          if (deal.successful) {
            pros.push(deal.transparencyDescription);
          }
          if (landedCalc.shippingFee === 0) {
            pros.push(`Free shipping expected under ${domain}'s standard policy (estimate)`);
          }
          if (landedCalc.pincodeNote) {
            pros.push(landedCalc.pincodeNote);
          }

          const cons: string[] = [];
          if (!isVerified) {
            cons.push('Live page schema unverified; price extracted from search index snippet');
          }
          if (nativeCurrency !== targetCurrency) {
            cons.push(`Forex converted from ${nativePrice} ${nativeCurrency} at live exchange rate`);
          }
          if (!inStock) {
            cons.push('Item currently out of stock or backordered on merchant page');
          }

          const sku = `LIVE-${canonicalIdentity.brand.slice(0, 3).toUpperCase()}-${canonicalIdentity.variantSignature.slice(0, 10).toUpperCase()}-${Math.abs(directUrl.length * 37).toString(36).slice(0, 4).toUpperCase()}`;

          listings.push({
            merchantId: `mch_live_${domain.replace(/[^a-z0-9]/g, '_')}`,
            merchantName,
            merchantDomain: domain,
            productTitle: finalTitle,
            productUrl: directUrl,
            sku,
            itemPrice: convertedPrice,
            estimatedShipping: landedCalc.shippingFee + landedCalc.platformFee + landedCalc.packagingFee,
            estimatedTax: landedCalc.taxes + landedCalc.customsDuty,
            totalLandedCost,
            currency: targetCurrency,
            inStock,
            warrantyPeriodMonths: 12,
            trustScore: trust.score,
            trustReasons: trust.reasons,
            pros,
            cons
          });
        }
      } catch {
        // Handle network timeout or block gracefully
      }
    });

    await Promise.all(crawlPromises);
    return listings;
  }
}

/**
 * Paid scraping APIs (Serper, Bright Data) must stay inside hard caps.
 * A fake fetch records every request, so this spends nothing and needs no network.
 */
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { ARBWebCrawler } from '../ARB/providers/web_crawler.js';
import { ARBScrapeBudget } from '../ARB/providers/scrape_budget.js';
import { ARBCurrencyConverter } from '../ARB/currency/forex_converter.js';
import { ARBResearchPayloadSchema } from '../shared/types/index.js';

process.env.LOG_LEVEL = 'silent';
const calls: string[] = [];
const realFetch = globalThis.fetch;

// Ten product links per search; every product page is "bot-blocked" (403) so the verifier
// would like to fall back to Bright Data for each one.
function installFakeFetch() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url.includes('api.brightdata.com') ? `brightdata:${JSON.parse(init.body).url}` : url);
    if (url.includes('google.serper.dev')) {
      const organic = Array.from({ length: 10 }, (_, i) => ({
        title: `Acme Wireless Earbuds Model ${i} - Best Buy`,
        link: `https://www.bestbuy.com/site/acme-earbuds-${i}/${1000 + i}.p`,
        snippet: `Acme Wireless Earbuds Model ${i}. $${49 + i}.99`
      }));
      return new Response(JSON.stringify({ organic }), { status: 200 });
    }
    if (url.includes('api.brightdata.com')) return new Response('<html></html>', { status: 200 });
    return new Response('blocked', { status: 403 });
  }) as typeof fetch;
}

const payload = ARBResearchPayloadSchema.parse({ productQuery: 'wireless earbuds', budgetCeiling: 100, currency: 'USD' });

beforeEach(() => {
  ARBScrapeBudget.reset();
  calls.length = 0;
  process.env.SERPER_API_KEY = 'test-serper';
  process.env.BRIGHTDATA_API_KEY = 'test-bd';
  delete process.env.PALS_SERPER_MAX_CALLS;
  delete process.env.PALS_BRIGHTDATA_MAX_CALLS;
  delete process.env.PALS_BRIGHTDATA_PAGES_PER_SEARCH;
  ARBCurrencyConverter.refreshRates = async () => {};
  installFakeFetch();
});

test.after(() => {
  globalThis.fetch = realFetch;
  delete process.env.SERPER_API_KEY;
  delete process.env.BRIGHTDATA_API_KEY;
});

const serper = () => calls.filter((c) => c.includes('google.serper.dev')).length;
const brightdata = () => calls.filter((c) => c.startsWith('brightdata:')).length;

test('one research run: Serper used for search, Bright Data only for 2 product pages', async () => {
  await ARBWebCrawler.crawl(payload, 3000);
  assert.equal(serper(), 2, 'one Serper search per region (IN, US)');
  assert.equal(brightdata(), 2, 'Bright Data is used for at most 2 pages per research, not every candidate');
});

test('the same search again is served from cache: no new paid calls', async () => {
  await ARBWebCrawler.crawl(payload, 3000);
  const before = serper();
  await ARBWebCrawler.crawl(payload, 3000);
  assert.equal(serper(), before);
});

test('hard caps: once the process limit is hit, no more paid calls are made', async () => {
  process.env.PALS_SERPER_MAX_CALLS = '1';
  process.env.PALS_BRIGHTDATA_MAX_CALLS = '1';
  await ARBWebCrawler.crawl(payload, 3000);
  await ARBWebCrawler.crawl({ ...payload, productQuery: 'bluetooth speaker' }, 3000);
  assert.equal(serper(), 1);
  assert.equal(brightdata(), 1);
});

test('limit 0 turns a paid API off completely', async () => {
  process.env.PALS_SERPER_MAX_CALLS = '0';
  process.env.PALS_BRIGHTDATA_MAX_CALLS = '0';
  await ARBWebCrawler.crawl(payload, 3000);
  assert.equal(serper(), 0);
  assert.equal(brightdata(), 0);
});

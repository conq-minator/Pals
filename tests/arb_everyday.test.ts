import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArbService, ARBQueryExtractor, ARBWebCrawler, ARBCurrencyConverter } from '../ARB/index.js';

// Hermetic: no live web crawl or forex refresh.
ARBWebCrawler.crawl = async () => [];
ARBCurrencyConverter.refreshRates = async () => {};

const arb = new ArbService();

async function research(prompt: string, allowAmbiguousGuess = true) {
  const extracted = ARBQueryExtractor.extractFromText(prompt);
  const payload = ARBQueryExtractor.toPayload(extracted);
  if (allowAmbiguousGuess) payload.allowAmbiguousGuess = true;
  const result = await arb.conductResearch(payload, 'test');
  return { extracted, result, titles: result.topRecommendations.map(l => l.productTitle.toLowerCase()) };
}

test('bandage returns first-aid listings from pharmacies, priced realistically', async () => {
  const { extracted, result, titles } = await research('bandage');
  assert.equal(extracted.category, 'pharmacy');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(titles.every(t => t.includes('bandage')));
  assert.ok(result.topRecommendations[0].totalLandedCost < 300);
  assert.ok(titles.every(t => !t.includes('authentic retail edition')));
});

test('crepe bandage under 300 respects the small budget', async () => {
  const { result, titles } = await research('buy crepe bandage under 300');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(titles.every(t => t.includes('crepe')));
  assert.ok(result.topRecommendations.every(l => l.totalLandedCost <= 300));
});

test('ddr5 ram returns memory modules, not laptops', async () => {
  const { extracted, result, titles } = await research('32gb ddr5 ram');
  assert.equal(extracted.category, 'pc_components');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(titles.every(t => t.includes('ddr5') && t.includes('desktop ram')));
  assert.ok(titles.every(t => !t.includes('laptop (')));
});

test('ddr5 ram 16gb under 8000 finds 16GB sticks', async () => {
  const { result } = await research('ddr5 ram 16gb under 8000');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(result.topRecommendations.every(l => l.totalLandedCost <= 8000));
});

test('brand-specific RAM query keeps only that brand', async () => {
  const { titles } = await research('corsair vengeance ddr5 32gb 6000mhz');
  assert.ok(titles.length > 0);
  assert.ok(titles.every(t => t.includes('corsair') && t.includes('6000mhz')));
});

test('ram for laptop returns SO-DIMM modules', async () => {
  const { titles } = await research('ddr5 ram for laptop');
  assert.ok(titles.length > 0);
  assert.ok(titles.every(t => t.includes('so-dimm')));
});

test('a laptop query with ddr5 still returns laptops', async () => {
  const { extracted, titles } = await research('gaming laptop 16gb ddr5 ram under 80k');
  assert.equal(extracted.category, 'laptops');
  assert.ok(titles.length > 0);
  assert.ok(titles.every(t => !t.includes('desktop ram')));
});

test('naan variants resolve to the right dish from Indian delivery apps', async () => {
  const garlic = await research('garlic naan near me');
  assert.ok(garlic.titles.length > 0);
  assert.ok(garlic.titles.every(t => t.includes('garlic naan')));

  const butter = await research('butter naan delivery');
  assert.ok(butter.titles.length > 0);
  assert.ok(butter.titles.every(t => t.includes('butter naan')), 'must not fall into the dairy butter path');

  const plain = await research('naan');
  assert.ok(plain.result.topRecommendations.every(l => l.merchantDomain !== 'doordash.com' && l.currency === 'INR'));
});

test('pizza queries: budget, topping and merchant targeting', async () => {
  const pepperoni = await research('order a large pepperoni pizza under 600');
  assert.ok(pepperoni.titles.length > 0);
  assert.ok(pepperoni.titles.every(t => t.includes('pepperoni')));
  assert.ok(pepperoni.result.topRecommendations.every(l => l.totalLandedCost <= 600));

  const dominos = await research('pizza from dominos');
  assert.ok(dominos.result.topRecommendations.length > 0);
  assert.ok(dominos.result.topRecommendations.every(l => l.merchantDomain.startsWith('dominos')));
});

test('USD shoppers get US merchants for local delivery', async () => {
  const { result } = await research('pepperoni pizza under $30');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(result.topRecommendations.every(l => l.currency === 'USD' && !l.merchantDomain.endsWith('.in')));
});

test('quick-commerce staples (milk, eggs) work', async () => {
  for (const q of ['milk', 'eggs']) {
    const { result, titles } = await research(q);
    assert.ok(result.qualifyingListingsFound > 0, q);
    assert.ok(titles.every(t => t.includes(q.replace(/s$/, ''))), q);
  }
});

test('unknown products return no fabricated listings', async () => {
  const { result } = await research('iphone 15 under 80000');
  assert.equal(result.qualifyingListingsFound, 0);
  assert.match(result.arbitrationSummary, /does not invent listings/);
});

test('purchase proposal total equals the quoted landed cost (no double discount)', async () => {
  const { result } = await research('pepperoni pizza under 600');
  for (const listing of result.topRecommendations) {
    const proposal = arb.preparePurchase(listing, 'test');
    assert.equal(proposal.pricingBreakdown.totalPayable, listing.totalLandedCost, listing.productTitle);
  }
});

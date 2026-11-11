import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ArbService,
  ARBQueryExtractor,
  ARBWebCrawler,
  ARBCurrencyConverter,
  ARBCanonicalIdentity,
  ARBAmbiguityDetector
} from '../ARB/index.js';
import { ARBMultiFactorRanker } from '../ARB/ranking/multi_factor_ranker.js';
import { ARBLandedCostCalculator } from '../ARB/pricing/landed_cost.js';
import { ARBEverydayCatalog } from '../ARB/providers/everyday_catalog.js';
import type { ARBResearchResult } from '../shared/types/index.js';

// Hermetic: keep a handle on the real crawler for the crawler-specific test, stub it elsewhere.
const realCrawl = ARBWebCrawler.crawl.bind(ARBWebCrawler);
ARBWebCrawler.crawl = async () => [];
ARBCurrencyConverter.refreshRates = async () => {};

const arb = new ArbService();
let seq = 0;

async function research(prompt: string, taskId: string = `reg-${seq++}`, userId?: string, allowAmbiguousGuess = true) {
  const extracted = ARBQueryExtractor.extractFromText(prompt);
  const payload = ARBQueryExtractor.toPayload(extracted);
  if (allowAmbiguousGuess) payload.allowAmbiguousGuess = true;
  const result = await arb.conductResearch(payload, taskId, userId);
  return { extracted, result, titles: titlesOf(result), taskId };
}
const titlesOf = (r: ARBResearchResult) => r.topRecommendations.map(l => l.productTitle.toLowerCase());
const NON_VEG = /chicken|pepperoni|mutton|zinger|non-veg/;

// ---------------------------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------------------------

test('contract: a minimal payload is accepted and schema defaults (trust floor) are applied', async () => {
  const result = await arb.conductResearch({ productQuery: 'milk', budgetCeiling: 500 }, 'reg-minimal');
  assert.ok(result.qualifyingListingsFound > 0);
  assert.ok(result.topRecommendations.every(l => l.trustScore >= 80), 'default 80/100 trust floor must apply');
});

// ---------------------------------------------------------------------------------------------
// ARB rule: never exceed the user's budget ceiling — including for multiple units
// ---------------------------------------------------------------------------------------------

test('budget is a hard ceiling on the whole order, not on one unit', async () => {
  const single = await research('pizza under 500');
  const double = await research('2 pizzas under 500');
  assert.equal(double.extracted.quantity, 2);
  assert.ok(double.result.qualifyingListingsFound > 0);
  assert.ok(double.result.qualifyingListingsFound < single.result.qualifyingListingsFound,
    'two pizzas must rule out options that only fit the budget as a single pizza');
  for (const l of double.result.topRecommendations) {
    assert.ok(l.totalLandedCost <= 500, `${l.productTitle} costs ${l.totalLandedCost}`);
    assert.ok(l.pros.includes('Price shown is for 2 units'));
  }
});

test('quantity is understood in natural phrasings and not confused with specs', () => {
  const qty = (q: string) => ARBQueryExtractor.extractFromText(q).quantity;
  assert.equal(qty('3 butter naan'), 3);
  assert.equal(qty('order 2 pepperoni pizzas under 1500'), 2);
  assert.equal(qty('buy me 4 garlic naan'), 4);
  for (const q of ['16gb ddr5 ram', '15 inch laptop under 60k', '1 litre milk', '12 eggs', 'iphone 15 128gb', '4k monitor', '2 tb ssd']) {
    assert.equal(qty(q), 1, q);
  }
});

test('every listing ARB returns is within budget and internally consistent', async () => {
  for (const q of ['pizza under 400', 'ddr5 ram 16gb under 8000', 'buy crepe bandage under 300', 'gaming laptop under 80k', 'milk under 100']) {
    const { extracted, result } = await research(q);
    assert.ok(result.qualifyingListingsFound > 0, q);
    for (const l of result.topRecommendations) {
      assert.ok(l.totalLandedCost <= extracted.budgetCeiling, `${q}: ${l.productTitle}`);
      assert.ok(l.totalLandedCost > 0 && l.itemPrice > 0);
      assert.ok(l.estimatedShipping >= 0 && l.estimatedTax >= 0);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// ARB rule: no fabricated listings, specs, negotiations or verifications
// ---------------------------------------------------------------------------------------------

test('specs are never bent to fit the request: a 64GB laptop request does not invent 64GB laptops', async () => {
  const { result, titles } = await research('gaming laptop 64gb ram under 2 lakh');
  assert.equal(result.qualifyingListingsFound, 0);
  assert.ok(titles.every(t => !t.includes('64gb')));
  assert.doesNotMatch(result.arbitrationSummary, /64GB RAM/);
});

test('discounts are labelled as public codes, never as negotiation', async () => {
  for (const q of ['pepperoni pizza', 'gaming laptop under 80k', 'mac mini']) {
    const { result } = await research(q);
    for (const l of result.topRecommendations) {
      const text = [...l.pros, ...l.cons].join(' ').toLowerCase();
      assert.doesNotMatch(text, /negotiated|merchant_bot|counter-offer/);
      if (text.includes('voucher')) assert.match(text, /public promotional code/);
    }
  }
});

test('a postal code is never reported as verified, and never invented for a proposal', async () => {
  const note = ARBLandedCostCalculator.calculate({ merchantDomain: 'amazon.in', itemPrice: 999, currency: 'INR', deliveryPostalCode: '560001' }).pincodeNote || '';
  assert.match(note, /560001/);
  assert.doesNotMatch(note, /verified deliverable/i);

  const { result } = await research('milk');
  const withoutPin = arb.preparePurchase(result.topRecommendations[0], 'reg-pin');
  assert.equal(withoutPin.prefilledShipping?.destinationPincode, undefined, 'must not default to a made-up pincode');
});

test('indicative catalog prices are disclosed and the report does not claim live confirmation', async () => {
  const { result } = await research('garlic naan');
  assert.ok(result.topRecommendations.every(l => l.cons.some(c => /indicative reference price/i.test(c))));
  assert.doesNotMatch(result.arbitrationSummary, /Confirmed against merchant specifications/);
  assert.match(result.arbitrationSummary, /indicative reference/i);
});

// ---------------------------------------------------------------------------------------------
// Requirement understanding
// ---------------------------------------------------------------------------------------------

test('dietary: "veg" is a hard constraint, not a keyword', async () => {
  const veg = await research('veg pizza under 400');
  assert.equal(veg.extracted.mandatorySpecifications['dietary'], 'veg');
  assert.ok(veg.result.qualifyingListingsFound >= 3, 'margherita options must qualify');
  assert.ok(veg.titles.every(t => !NON_VEG.test(t)));

  const vegBurger = await research('veg burger');
  assert.ok(vegBurger.titles.length >= 3);
  assert.ok(vegBurger.titles.every(t => !NON_VEG.test(t)), 'McChicken / Zinger must be excluded');

  const nonVeg = await research('non veg pizza');
  assert.equal(nonVeg.extracted.mandatorySpecifications['dietary'], 'non-veg');
  assert.ok(nonVeg.titles.length > 0);
  assert.ok(nonVeg.titles.every(t => NON_VEG.test(t)));
});

test('a stored vegetarian preference filters food results without being asked each time', async () => {
  arb.setUserPreferences('reg-veg-user', { dietary: 'veg' });
  const { titles } = await research('burger', 'reg-pref', 'reg-veg-user');
  assert.ok(titles.length > 0);
  assert.ok(titles.every(t => !NON_VEG.test(t)));
});

test('synonyms, brand spellings and plurals resolve to real offers', async () => {
  const cases: Array<[string, RegExp]> = [
    ['tylenol', /paracetamol/],
    ['anda', /eggs/],
    ['plaster', /bandage/],
    ['burgers', /burger/],
    ['dominos', /domino's/],
    ['fever tablet', /paracetamol/]
  ];
  for (const [q, expected] of cases) {
    const { result, titles } = await research(q);
    assert.ok(result.qualifyingListingsFound > 0, `"${q}" returned nothing`);
    assert.ok(titles.every(t => expected.test(t)), `"${q}" -> ${titles[0]}`);
  }
});

test('RAM module requests: SO-DIMM modules are not mistaken for laptops, and laptops never appear', async () => {
  const sodimm = await research('sodimm 16gb ddr5');
  assert.ok(sodimm.titles.length > 0);
  assert.ok(sodimm.titles.every(t => t.includes('so-dimm')));

  const desktop = await research('32gb ddr5 ram');
  assert.ok(desktop.titles.length > 0);
  assert.ok(desktop.titles.every(t => t.includes('desktop ram')));
});

test('ambiguity questions are only raised for genuinely ambiguous requests', () => {
  assert.equal(ARBAmbiguityDetector.checkAmbiguity('ram').isAmbiguous, true);
  assert.equal(ARBAmbiguityDetector.checkAmbiguity('iphone with 8gb ram').isAmbiguous, false);
  assert.equal(ARBAmbiguityDetector.checkAmbiguity('gaming laptop 16gb ram').isAmbiguous, false);
  assert.equal(ARBAmbiguityDetector.checkAmbiguity('garlic naan').isAmbiguous, false);
});

// ---------------------------------------------------------------------------------------------
// Product identity
// ---------------------------------------------------------------------------------------------

test('different products from a multi-word brand keep distinct identities', async () => {
  const key = (t: string, b: string) => ARBCanonicalIdentity.extractIdentity(t, b).canonicalKey;
  assert.notEqual(key('Burger King Veg Whopper Burger via Zomato', 'Burger King'), key('Burger King Crispy Veg Burger via Zomato', 'Burger King'));
  assert.notEqual(key('Pizza Hut Margherita Pan Pizza (Medium)', 'Pizza Hut'), key('Pizza Hut Chicken Pepperoni Pan Pizza (Medium)', 'Pizza Hut'));

  // ...so no offer is silently dropped as a "duplicate"
  const { result } = await research('pizza');
  assert.equal(result.qualifyingListingsFound, ARBEverydayCatalog.resolve('pizza', 'INR').length);
});

// ---------------------------------------------------------------------------------------------
// Closest alternatives when nothing qualifies
// ---------------------------------------------------------------------------------------------

test('when nothing qualifies, ARB reports the closest real alternatives instead of a dead end', async () => {
  const { result } = await research('32gb ddr5 ram under 9000');
  assert.equal(result.qualifyingListingsFound, 0);
  assert.ok(result.totalListingsScanned > 0, 'near-misses must reach the agent loop');
  assert.match(result.arbitrationSummary, /Closest match to your specs/);
  assert.match(result.arbitrationSummary, /over your 9,000 INR budget/);
  assert.match(result.arbitrationSummary, /Best alternative within your budget/);
  assert.equal(result.topRecommendations.length, 0, 'alternatives are suggestions, never recommendations');
});

// ---------------------------------------------------------------------------------------------
// Follow-up refinement
// ---------------------------------------------------------------------------------------------

test('refinement: skipping and targeting merchants works for any merchant', async () => {
  const skip = await research('pizza', 'reg-skip');
  assert.ok(skip.result.topRecommendations.some(l => l.merchantDomain === 'swiggy.com'));
  const skipped = await arb.refineResearch('reg-skip', 'skip swiggy', 'reg-skip');
  assert.ok(skipped.qualifyingListingsFound > 0);
  assert.ok(skipped.topRecommendations.every(l => l.merchantDomain !== 'swiggy.com'));

  await research('milk', 'reg-skip2');
  const two = await arb.refineResearch('reg-skip2', 'skip blinkit and zepto', 'reg-skip2');
  assert.ok(two.qualifyingListingsFound > 0);
  assert.ok(two.topRecommendations.every(l => !/blinkit|zepto/.test(l.merchantDomain)));

  await research('pizza', 'reg-only');
  const only = await arb.refineResearch('reg-only', 'only from dominos', 'reg-only');
  assert.ok(only.qualifyingListingsFound > 0);
  assert.ok(only.topRecommendations.every(l => l.merchantDomain.startsWith('dominos')));
});

test('refinement: "same but 32gb" changes RAM only and does not invent a storage requirement', async () => {
  await research('ddr5 ram 16gb', 'reg-ram');
  const refined = await arb.refineResearch('reg-ram', 'same but 32gb', 'reg-ram');
  assert.ok(refined.qualifyingListingsFound > 0);
  assert.ok(titlesOf(refined).every(t => /32gb|64gb/.test(t)));
  assert.doesNotMatch(refined.arbitrationSummary, /storage/i);
});

test('refinement: "cheaper" when already on the cheapest option keeps the results and says so', async () => {
  const base = await research('milk', 'reg-cheaper');
  const refined = await arb.refineResearch('reg-cheaper', 'cheaper', 'reg-cheaper');
  assert.equal(refined.qualifyingListingsFound, base.result.qualifyingListingsFound);
  assert.match(refined.arbitrationSummary, /No cheaper option found/);
  // and a later refinement still works from the preserved state
  const after = await arb.refineResearch('reg-cheaper', 'skip bigbasket', 'reg-cheaper');
  assert.ok(after.qualifyingListingsFound > 0);
});

test('refinement: "cheaper" returns strictly cheaper options when they exist', async () => {
  arb.setUserPreferences('reg-brand-user', { preferredBrands: ['Corsair'] });
  const base = await research('32gb ddr5 ram', 'reg-cheaper2', 'reg-brand-user');
  const top = base.result.topRecommendations[0];
  assert.match(top.productTitle, /Corsair/, 'preferred brand is ranked first');
  const refined = await arb.refineResearch('reg-cheaper2', 'make it cheaper', 'reg-cheaper2');
  assert.ok(refined.qualifyingListingsFound > 0);
  assert.ok(refined.topRecommendations.every(l => l.totalLandedCost < top.totalLandedCost));
});

// ---------------------------------------------------------------------------------------------
// Landed cost primacy
// ---------------------------------------------------------------------------------------------

test('cross-border offers carry estimated shipping and import duty, so they cannot undercut local stores on sticker price', async () => {
  const { result } = await research('mac mini');
  const us = result.topRecommendations.filter(l => /microcenter|bestbuy|bhphotovideo/.test(l.merchantDomain));
  assert.ok(us.length > 0);
  for (const l of us) {
    assert.ok(l.estimatedShipping > 0 && l.estimatedTax > 0, `${l.merchantDomain} must include import costs`);
    assert.ok(l.cons.some(c => /cross-border/i.test(c)));
  }
  assert.ok(!/microcenter|bestbuy|bhphotovideo/.test(result.topRecommendations[0].merchantDomain),
    'an Indian merchant must be the top landed-cost pick for an INR shopper');
});

test('fastest-delivery badge goes to the genuinely fastest offer', async () => {
  const { result } = await research('milk');
  const fastest = result.topRecommendations.filter(l => l.pros.some(p => p.includes('Fastest')));
  assert.equal(fastest.length, 1);
  const minutes = (l: typeof fastest[number]) => ARBMultiFactorRanker.parseEtaMinutes(l.pros) ?? Infinity;
  const best = Math.min(...result.topRecommendations.map(minutes));
  assert.equal(minutes(fastest[0]), best);
  assert.equal(ARBMultiFactorRanker.parseEtaMinutes(['Delivery ETA: 25-30 mins']), 30);
  assert.equal(ARBMultiFactorRanker.parseEtaMinutes(['Estimated delivery: 2-4 Days']), 4 * 24 * 60);
});

// ---------------------------------------------------------------------------------------------
// Purchase proposal = exactly what was quoted
// ---------------------------------------------------------------------------------------------

test('proposal total equals the quoted landed cost for every kind of listing', async () => {
  for (const q of ['pepperoni pizza', '2 pepperoni pizzas under 1500', 'mac mini', 'gaming laptop under 80k', 'bandage', '32gb ddr5 ram']) {
    const { extracted, result } = await research(q);
    assert.ok(result.topRecommendations.length > 0, q);
    for (const listing of result.topRecommendations) {
      const proposal = arb.preparePurchase(listing, 'reg-proposal');
      assert.ok(Math.abs(proposal.pricingBreakdown.totalPayable - listing.totalLandedCost) < 0.011,
        `${q} / ${listing.merchantDomain}: proposal ${proposal.pricingBreakdown.totalPayable} vs quoted ${listing.totalLandedCost}`);
      assert.ok(proposal.pricingBreakdown.totalPayable <= extracted.budgetCeiling);
      assert.equal(proposal.merchantDomain, listing.merchantDomain);
      assert.ok(new Date(proposal.expiresAt).getTime() > Date.now());
    }
  }
});

test('proposal carries the requested quantity through to the payment handoff', async () => {
  const { result } = await research('2 pepperoni pizzas under 1500');
  const listing = result.topRecommendations[0];
  const proposal = arb.preparePurchase(listing, 'reg-qty');
  const item = (proposal.pulseHandoffPayload as any).items[0];
  assert.equal(item.quantity, 2);
  assert.ok(Math.abs(item.unitPrice * 2 - (proposal.pricingBreakdown.basePrice - proposal.pricingBreakdown.discountApplied)) < 0.02);
});

// ---------------------------------------------------------------------------------------------
// Live crawler (network stubbed)
// ---------------------------------------------------------------------------------------------

test('crawler: an EMI instalment in a search snippet is never taken as the product price', async () => {
  const resultBlock = (url: string, title: string, snippet: string) =>
    `<div class="result results_links results_links_deep web-result "><h2 class="result__title">` +
    `<a rel="nofollow" class="result__a" href="${url}">${title}</a></h2>` +
    `<a class="result__snippet" href="${url}">${snippet}</a></div>`;

  const searchHtml =
    resultBlock('https://www.amazon.in/dp/B0EMIEMI01', 'Lenovo LOQ 15 Gaming Laptop RTX 4050 - Amazon.in', 'No Cost EMI from ₹3,299/month. 16GB RAM, 512GB SSD.') +
    resultBlock('https://www.flipkart.com/lenovo-loq-15/p/itm123', 'Lenovo LOQ 15 Gaming Laptop RTX 4050 - Flipkart', 'Buy Lenovo LOQ 15 at ₹69,990. 16GB RAM, 512GB SSD.');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = String(typeof input === 'string' ? input : input.url);
    if (url.includes('duckduckgo.com')) return new Response(searchHtml, { status: 200 });
    return new Response('', { status: 404 }); // product pages unreachable -> snippet fallback
  }) as typeof fetch;

  try {
    const listings = await realCrawl(
      { productQuery: 'lenovo loq 15', budgetCeiling: 100000, currency: 'INR', mandatorySpecifications: {}, minMerchantTrustScore: 80 },
      1000
    );
    assert.ok(listings.every(l => l.itemPrice > 10000), 'a ₹3,299 EMI must not be listed as the laptop price');
    assert.ok(listings.every(l => l.merchantDomain !== 'amazon.in'));
    const flipkart = listings.filter(l => l.merchantDomain === 'flipkart.com');
    assert.ok(flipkart.length >= 1);
    assert.equal(flipkart[0].itemPrice, 69990);
    assert.ok(flipkart[0].cons.some(c => /unverified/i.test(c)), 'snippet-sourced prices must be flagged as unverified');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

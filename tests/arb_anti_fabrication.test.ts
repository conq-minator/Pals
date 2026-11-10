import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArbService, ARBQueryExtractor, ARBWebCrawler, ARBCurrencyConverter, ARBDealArbitrator } from '../ARB/index.js';

// Hermetic: no live network calls
ARBWebCrawler.crawl = async () => [];
ARBCurrencyConverter.refreshRates = async () => {};

const arb = new ArbService();

test('deal_arbitrator: does not fabricate fake MERCHANT_BOT chat transcripts', () => {
  const deal = ARBDealArbitrator.arbitrateDeal('croma.com', 55000, 'INR');
  assert.equal(deal.negotiationTranscript, undefined, 'Must not generate fake negotiation transcripts');
  assert.notEqual(deal.dealType, 'DYNAMIC_NEGOTIATED_DEAL', 'Must not claim dynamic negotiation occurred when none did');
  if (deal.successful) {
    assert.equal(deal.dealType, 'PUBLIC_COUPON', 'Discounts must be transparently labelled as public coupons');
  }
});

test('deal_arbitrator: swiggy/zomato do not receive fabricated bot concessions', () => {
  const deal = ARBDealArbitrator.arbitrateDeal('swiggy.com', 500, 'INR');
  assert.equal(deal.negotiationTranscript, undefined);
  assert.notEqual(deal.dealType, 'DYNAMIC_NEGOTIATED_DEAL');
});

test('agent_provider: does not template requested 64GB RAM into 16GB laptop titles', async () => {
  const extracted = ARBQueryExtractor.extractFromText('gaming laptop 64gb ram under 80000');
  const result = await arb.conductResearch(ARBQueryExtractor.toPayload(extracted), 'test-ram-integrity');
  
  // Real fleet laptops have 16GB RAM; requesting 64GB must find 0 qualifying 64GB laptops at this price
  assert.equal(result.qualifyingListingsFound, 0, 'No 16GB laptop should magically qualify as 64GB');
  
  // None of the recommendations or titles should have "64GB" templated in
  for (const listing of result.topRecommendations) {
    assert.ok(!listing.productTitle.includes('64GB'), 'Product title must not interpolate requested RAM');
  }
});

test('agent_provider: Mac mini titles do not interpolate requested RAM', async () => {
  const extracted = ARBQueryExtractor.extractFromText('mac mini 64gb under 70000');
  const result = await arb.conductResearch(ARBQueryExtractor.toPayload(extracted), 'test-macmini-integrity');
  
  // Base Mac mini is 16GB, cannot qualify for 64GB under 70000
  assert.equal(result.qualifyingListingsFound, 0);
});

test('service: concurrent searches do not corrupt report links (no lastQuery race condition)', async () => {
  const extracted1 = ARBQueryExtractor.extractFromText('unfindable item alpha 12345');
  const extracted2 = ARBQueryExtractor.extractFromText('unfindable item beta 67890');

  const [res1, res2] = await Promise.all([
    arb.conductResearch(ARBQueryExtractor.toPayload(extracted1), 'corr-1'),
    arb.conductResearch(ARBQueryExtractor.toPayload(extracted2), 'corr-2')
  ]);

  assert.ok(res1.arbitrationSummary.includes('alpha'), 'Report 1 must mention its own query tokens');
  assert.ok(!res1.arbitrationSummary.includes('beta'), 'Report 1 must not contain tokens from concurrent query 2');

  assert.ok(res2.arbitrationSummary.includes('beta'), 'Report 2 must mention its own query tokens');
  assert.ok(!res2.arbitrationSummary.includes('alpha'), 'Report 2 must not contain tokens from concurrent query 1');
});

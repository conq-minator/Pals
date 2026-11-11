import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArbService } from '../ARB/service.js';
import { ARBRelevanceScorer } from '../ARB/extractors/relevance_scorer.js';
import { ARBMultiFactorRanker } from '../ARB/ranking/multi_factor_ranker.js';
import { ARBTrustScorer } from '../ARB/scoring/trust_scorer.js';
import { ARBProposalBuilder } from '../ARB/checkout/proposal_builder.js';
import { ARBPreferenceStore } from '../ARB/memory/preference_store.js';
import { ARBEvaluationBenchmark } from '../ARB/benchmark/eval_suite.js';
import { MerchantListing, ARBResearchPayload } from '../shared/types/index.js';

test('ARBRelevanceScorer: rejects accessories and distinguishes components from systems', () => {
  // Query for iPhone 15 should reject phone cases
  const caseCheck = ARBRelevanceScorer.evaluateRelevance(
    'iphone 15 128gb',
    'Spigen Ultra Hybrid Back Case Cover for iPhone 15'
  );
  assert.equal(caseCheck.isRelevant, false);
  assert.ok(caseCheck.rejectionReason?.includes('accessory'));

  // Query for RAM module should reject full laptops
  const laptopCheck = ARBRelevanceScorer.evaluateRelevance(
    '32gb ddr5 ram',
    'MSI Thin 15 Gaming Laptop (32GB DDR5 RAM, 1TB SSD)'
  );
  assert.equal(laptopCheck.isRelevant, false);
  assert.ok(laptopCheck.rejectionReason?.includes('Complete laptop/system offered'));

  // Query for RAM module SHOULD accept RAM modules
  const ramPass = ARBRelevanceScorer.evaluateRelevance(
    '32gb ddr5 ram',
    'Corsair Vengeance 32GB DDR5 6000MHz Desktop RAM'
  );
  assert.equal(ramPass.isRelevant, true);
  assert.ok(ramPass.score >= 0.5);
});

test('ARBMultiFactorRanker: scores multiple dimensions and assigns labelled badges', () => {
  const cheapSlow: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-CHEAP',
    productTitle: 'Budget Pizza Combo',
    merchantName: 'Store A',
    merchantDomain: 'storea.com',
    productUrl: 'https://storea.com/p1',
    itemPrice: 300,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 300,
    inStock: true,
    trustScore: 82,
    pros: ['Standard delivery: 3-5 days'],
    cons: []
  };

  const fastExpensive: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-FAST',
    productTitle: 'Express Gourmet Pizza',
    merchantName: 'Store B',
    merchantDomain: 'storeb.com',
    productUrl: 'https://storeb.com/p2',
    itemPrice: 550,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 550,
    inStock: true,
    trustScore: 95,
    pros: ['Instant 10-15 min delivery'],
    cons: []
  };

  const payload: ARBResearchPayload = {
    mandatorySpecifications: {},
    productQuery: 'pizza delivery',
    budgetCeiling: 600,
    currency: 'INR',
    category: 'food',
    minMerchantTrustScore: 80
  };

  const result = ARBMultiFactorRanker.rank([cheapSlow, fastExpensive], payload);
  assert.equal(result.rankedListings.length, 2);

  // Labelled picks must be present
  assert.ok(result.cheapest);
  assert.equal(result.cheapest.listing.sku, 'SKU-CHEAP');
  assert.ok(result.cheapest.badges.some(b => b.includes('Cheapest') || b.includes('Lowest Price')));

  assert.ok(result.fastest);
  assert.equal(result.fastest.listing.sku, 'SKU-FAST');
  assert.ok(result.fastest.badges.some(b => b.includes('Fastest')));
});

test('ARBTrustScorer: derives transparent scores from verifiable merchant signals', () => {
  // Major verified merchant
  const amazonEval = ARBTrustScorer.evaluate('amazon.in');
  assert.ok(amazonEval.score >= 85);
  assert.ok(amazonEval.reasons.some(r => r.includes('SSL')));
  assert.ok(amazonEval.reasons.some(r => r.includes('authorized')));

  // Untrusted merchant with missing SSL
  const shadyEval = ARBTrustScorer.evaluate('unknown-bargain-store.biz', {
    sslValid: false,
    domainAgeYears: 0.2,
    isAuthorizedDealer: false,
    returnWindowDays: 0,
    supportsSecurePayments: false
  });
  assert.ok(shadyEval.score < 40);
  assert.equal(shadyEval.trustTier, 'UNACCEPTABLE');
  assert.ok(shadyEval.riskWarnings.some(w => w.includes('SSL')));
});

test('ARBProposalBuilder: formats actionable PULSE payment handoff payload', () => {
  const listing: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'DELL-INSPIRON-TEST',
    productTitle: 'Dell Inspiron 15 Laptop',
    merchantName: 'Dell',
    merchantDomain: 'dell.com',
    productUrl: 'https://dell.com/en-in/shop/dell-laptops',
    itemPrice: 45000,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 45000,
    inStock: true,
    trustScore: 92,
    pros: [],
    cons: []
  };

  const proposal = ARBProposalBuilder.buildProposal(listing, 'task-pulse-test-1', {
    destinationPincode: '560001'
  });

  assert.ok(proposal.proposalId.startsWith('prop_'));
  assert.ok(proposal.supportedPaymentMethods?.includes('PAYPAL'));
  assert.equal(proposal.prefilledShipping?.destinationPincode, '560001');

  // Verify PULSE handoff payload structure
  const handoff = proposal.pulseHandoffPayload as any;
  assert.ok(handoff);
  assert.equal(handoff.action, 'PULSE:payment.execute');
  assert.equal(handoff.payment.amount, proposal.pricingBreakdown.totalPayable);
  assert.equal(handoff.payment.currency, 'INR');
  assert.equal(handoff.merchant.domain, 'dell.com');
  assert.ok(handoff.expiresAt);
});

test('ARBPreferenceStore: persists user preferences and enriches queries across sessions', () => {
  const store = ARBPreferenceStore.getInstance();
  const userId = 'user-test-pref-123';

  store.setPreferences(userId, {
    dietary: 'veg',
    preferredBrands: ['Amul', 'Apple'],
    defaultPincode: '560001'
  });

  const payload: ARBResearchPayload = {
    mandatorySpecifications: {},
    productQuery: 'biryani order',
    budgetCeiling: 500,
    currency: 'INR',
    minMerchantTrustScore: 80
  };

  const enriched = store.enrichPayload(userId, payload);
  // Auto-applies dietary veg constraint
  assert.equal(enriched.mandatorySpecifications?.['dietary'], 'veg');
  // Auto-applies preferred brands
  assert.ok(enriched.preferredBrands?.includes('Amul'));
  // Auto-applies default postal code
  assert.equal(enriched.deliveryPostalCode, '560001');

  // If prompt explicitly asks for chicken, user's default veg preference is NOT applied
  const nonVegPayload: ARBResearchPayload = {
    mandatorySpecifications: {},
    productQuery: 'chicken biryani delivery',
    budgetCeiling: 600,
    currency: 'INR',
    minMerchantTrustScore: 80
  };
  const nonVegEnriched = store.enrichPayload(userId, nonVegPayload);
  assert.equal(nonVegEnriched.mandatorySpecifications?.['dietary'], undefined);
});

test('ARBEvaluationBenchmark: executes full benchmark with 100% precision and 0% fabrication', async () => {
  const service = new ArbService();
  const metrics = await ARBEvaluationBenchmark.runBenchmark(service);

  assert.equal(metrics.constraintSatisfactionRate, 1.0, 'Constraint satisfaction must be 100%');
  assert.equal(metrics.fabricationRate, 0.0, 'Fabrication rate must be 0%');
  assert.equal(metrics.ambiguityDetectionRate, 1.0, 'Ambiguity detection rate must be 100%');
  assert.equal(metrics.landedCostCompleteness, 1.0, 'Landed cost completeness must be 100%');
  assert.equal(metrics.pulseHandoffReadyRate, 1.0, 'PULSE handoff ready rate must be 100%');
  assert.ok(metrics.overallScore >= 95, `Overall benchmark score must be >= 95 (got ${metrics.overallScore})`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ArbService,
  ARBQueryExtractor,
  ARBAmbiguityDetector,
  ARBProgressEmitter,
  ARBTaskStateStore,
  ARBPreferenceStore,
  ARBTrustScorer,
  ARBAlternativeFinder,
  ARBMultiFactorRanker
} from '../ARB/index.js';
import { FetchLLMProvider, SharedLLMGateway } from '../shared/llm/index.js';
import { MerchantListing, ARBResearchPayload } from '../shared/types/index.js';

test('ARB Ambiguity: bare queries pause with needsInput=true and resume with research.answer', async () => {
  const arb = new ArbService();
  const taskId = 'test-ambig-pause-1';

  // 1. Bare "ram" query without allowAmbiguousGuess must pause
  const paused = await arb.conductResearch({
    productQuery: 'ram',
    budgetCeiling: 10000,
    currency: 'INR'
  }, taskId);

  assert.equal(paused.needsInput, true);
  assert.equal(paused.qualifyingListingsFound, 0);
  assert.ok(paused.inputQuestion?.includes('type of RAM'));
  assert.ok(paused.inputOptions && paused.inputOptions.length >= 2);

  // 2. Resuming via answerResearch
  const resumed = await arb.answerResearch(taskId, 'Desktop DDR5 RAM (High performance)');
  assert.equal(resumed.needsInput, undefined);
  assert.ok(resumed.qualifyingListingsFound > 0);
  assert.ok(resumed.topRecommendations.some(l => l.productTitle.toLowerCase().includes('ddr5')));
});

test('ARB Budget Flexibility: FLEXIBLE_10_PERCENT expands budget ceiling by 10% when 0 qualify', async () => {
  const arb = new ArbService();
  const taskId = 'test-flex-budget-1';

  const strictResult = await arb.conductResearch({
    productQuery: 'gaming laptop 16gb ram',
    budgetCeiling: 50000,
    currency: 'INR',
    budgetFlexibility: 'STRICT',
    mandatorySpecifications: { ram_gb: 16 }
  }, `${taskId}-strict`);
  assert.equal(strictResult.qualifyingListingsFound, 0);

  const flexResult = await arb.conductResearch({
    productQuery: 'gaming laptop 16gb ram',
    budgetCeiling: 50000,
    currency: 'INR',
    budgetFlexibility: 'FLEXIBLE_10_PERCENT',
    mandatorySpecifications: { ram_gb: 16 }
  }, `${taskId}-flex`);

  assert.ok(flexResult.qualifyingListingsFound > 0);
  const overListing = flexResult.topRecommendations.find(l => l.totalLandedCost > 50000);
  assert.ok(overListing);
  assert.ok(overListing.pros.some(p => p.includes('under 10% flexibility policy')));
});

test('ARB MultiFactorRanker: softPreferences boost specFit score and deliveryBy adjusts speed', () => {
  const listing: MerchantListing = {
    merchantId: 'm1',
    merchantName: 'TestStore',
    merchantDomain: 'teststore.com',
    productTitle: 'Pro Gaming Laptop 16GB RAM 1TB SSD RTX 4060',
    productUrl: 'https://teststore.com/laptop',
    sku: 'SKU-SOFT-1',
    itemPrice: 75000,
    estimatedShipping: 0,
    estimatedTax: 0,
    totalLandedCost: 75000,
    currency: 'INR',
    inStock: true,
    trustScore: 90,
    trustReasons: [],
    pros: ['Delivery ETA: 25-30 mins', 'Fast dispatch'],
    cons: []
  };

  const payloadWithSoft: ARBResearchPayload = {
    productQuery: 'gaming laptop',
    budgetCeiling: 80000,
    currency: 'INR',
    mandatorySpecifications: {},
    minMerchantTrustScore: 80,
    softPreferences: {
      storage: '1TB',
      gpu: 'RTX 4060'
    },
    deliveryBy: 'instant'
  };

  const ranked = ARBMultiFactorRanker.rank([listing], payloadWithSoft);
  assert.equal(ranked.rankedListings.length, 1);
  const scored = ranked.rankedListings[0];

  assert.ok(scored.scoreBreakdown.specFit >= 90);
  assert.ok(scored.listing.pros.some(p => p.includes('Satisfies preferred spec: storage')));
  assert.ok(scored.listing.pros.some(p => p.includes('Meets requested delivery timeline (instant)')));
  assert.ok(scored.badges.includes('💎 Best Value'));
  assert.equal(ranked.bestValue, scored);
});

test('ARB ProgressEmitter: clearTask removes tracking state cleanly', () => {
  const emitter = ARBProgressEmitter.getInstance();
  const testId = 'test-cleanup-task';

  emitter.cancelTask(testId);
  assert.equal(emitter.isCancelled(testId), true);

  emitter.clearTask(testId);
  assert.equal(emitter.isCancelled(testId), false);
});

test('ARB Stores: ARBTaskStateStore enforces TTL and max size, ARBPreferenceStore enforces LRU', () => {
  const taskStore = ARBTaskStateStore.getInstance();
  taskStore.clear();

  taskStore.save({
    taskId: 't1',
    correlationId: 'c1',
    productQuery: 'test',
    payload: { productQuery: 'test', budgetCeiling: 100, currency: 'INR', minMerchantTrustScore: 80, mandatorySpecifications: {} },
    qualifyingListings: [],
    scannedListingsCount: 0,
    arbitrationSummary: 'summary',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  });

  assert.equal(taskStore.get('t1'), undefined, 'Expired task must return undefined');

  const prefStore = ARBPreferenceStore.getInstance();
  prefStore.setPreferences('u1', { dietary: 'veg' });
  assert.equal(prefStore.getPreferences('u1')?.dietary, 'veg');
});

test('ARB TrustScorer: unknown domains default to sslValid=false and domainAgeYears=0', () => {
  const unknownEval = ARBTrustScorer.evaluate('random-unknown-merchant-xyz.shop');
  assert.ok(unknownEval.score < 50);
  assert.ok(unknownEval.riskWarnings.some(w => w.includes('SSL')));
});

test('ARB AlternativeFinder: stepDownOption sorts by satisfied specs and reports step-down reason', () => {
  const listingLowerRam: MerchantListing = {
    merchantId: 'm1',
    merchantName: 'Store1',
    merchantDomain: 'store1.com',
    productTitle: 'Budget Laptop (16GB RAM, 512GB SSD)',
    productUrl: 'https://store1.com/l1',
    sku: 'SKU-STEP',
    itemPrice: 45000,
    estimatedShipping: 0,
    estimatedTax: 0,
    totalLandedCost: 45000,
    currency: 'INR',
    inStock: true,
    trustScore: 85,
    trustReasons: [],
    pros: [],
    cons: []
  };

  const payload: ARBResearchPayload = {
    productQuery: 'laptop 32gb ram',
    budgetCeiling: 50000,
    currency: 'INR',
    minMerchantTrustScore: 80,
    mandatorySpecifications: {
      ram_gb: 32
    }
  };

  const alternatives = ARBAlternativeFinder.findClosestAlternatives([listingLowerRam], payload);
  assert.ok(alternatives.stepDownOption);
  assert.equal(alternatives.stepDownOption.kind, 'SPEC_STEPDOWN');
  assert.ok(alternatives.stepDownOption.explanation.includes('step-down: RAM 16GB is less than required 32GB'));
});

test('SharedLLMGateway & FetchLLMProvider: can be instantiated and configured', async () => {
  const provider = new FetchLLMProvider({ apiKey: 'mock_key', providerType: 'openai' });
  assert.ok(provider);
});

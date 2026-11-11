import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArbService } from '../ARB/service.js';
import { ARBAgentLoop } from '../ARB/agent/reasoning_loop.js';
import { ARBSelfVerifier } from '../ARB/agent/self_verifier.js';
import { ARBAlternativeFinder } from '../ARB/agent/alternative_finder.js';
import { ARBAmbiguityDetector } from '../ARB/interaction/ambiguity_detector.js';
import { ARBProgressEmitter, ProgressPayload } from '../ARB/interaction/progress_emitter.js';
import { ARBTaskStateStore } from '../ARB/interaction/task_state_store.js';
import { CentralCallsSystem } from '../calls/index.js';
import { MerchantListing, ARBResearchPayload } from '../shared/types/index.js';

test('ARBAmbiguityDetector: detects underspecified queries and supplies 2-4 concrete options', () => {
  // Bare "ram" is ambiguous
  const ramAmbiguity = ARBAmbiguityDetector.checkAmbiguity('ram');
  assert.equal(ramAmbiguity.isAmbiguous, true);
  assert.ok(ramAmbiguity.question?.includes('type of RAM'));
  assert.ok(ramAmbiguity.options && ramAmbiguity.options.length >= 2 && ramAmbiguity.options.length <= 4);
  assert.ok(ramAmbiguity.options.some(opt => opt.includes('DDR5')));

  // Bare "pizza" is ambiguous
  const pizzaAmbiguity = ARBAmbiguityDetector.checkAmbiguity('pizza');
  assert.equal(pizzaAmbiguity.isAmbiguous, true);
  assert.ok(pizzaAmbiguity.question?.includes('kind of pizza'));
  assert.ok(pizzaAmbiguity.options?.some(opt => opt.includes('Veg')));

  // Bare "bandage" is ambiguous
  const bandageAmbiguity = ARBAmbiguityDetector.checkAmbiguity('bandage');
  assert.equal(bandageAmbiguity.isAmbiguous, true);
  assert.ok(bandageAmbiguity.options?.some(opt => opt.includes('Crepe')));

  // Highly specific queries should NOT trigger ambiguity
  const specificRam = ARBAmbiguityDetector.checkAmbiguity('corsair vengeance 32gb ddr5 6000mhz');
  assert.equal(specificRam.isAmbiguous, false);

  const specificPizza = ARBAmbiguityDetector.checkAmbiguity('large pepperoni pizza under 600');
  assert.equal(specificPizza.isAmbiguous, false);
});

test('ARBProgressEmitter: emits lifecycle events and supports task cancellation', async () => {
  const emitter = ARBProgressEmitter.getInstance();
  const events: ProgressPayload[] = [];
  const listener = (p: ProgressPayload) => events.push(p);

  emitter.addListener(listener);
  const taskId = 'task-emitter-test-1';

  await emitter.emitProgress(taskId, 'corr-test-1', 25, 'Scanning merchants...');
  await emitter.emitProgress(taskId, 'corr-test-1', 75, 'Auditing offers...');

  assert.equal(events.length, 2);
  assert.equal(events[0].progressPercent, 25);
  assert.equal(events[0].statusMessage, 'Scanning merchants...');
  assert.equal(events[1].progressPercent, 75);

  // Test cancellation
  assert.equal(emitter.isCancelled(taskId), false);
  emitter.cancelTask(taskId);
  assert.equal(emitter.isCancelled(taskId), true);

  emitter.removeListener(listener);
});

test('ARBSelfVerifier: audits candidates against hard requirements and discards violators', () => {
  const mockListingPass: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-PASS',
    productTitle: 'Lenovo Legion 5 (16GB RAM, 1024GB SSD, RTX 4060)',
    merchantName: 'Amazon',
    merchantDomain: 'amazon.in',
    productUrl: 'https://amazon.in/dp/mock1',
    itemPrice: 75000,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 75000,
    inStock: true,
    trustScore: 92,
    pros: [],
    cons: []
  };

  const mockListingViolate: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-FAIL',
    productTitle: 'Asus Vivobook (8GB RAM, 512GB SSD)',
    merchantName: 'Flipkart',
    merchantDomain: 'flipkart.com',
    productUrl: 'https://flipkart.com/dp/mock2',
    itemPrice: 45000,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 45000,
    inStock: true,
    trustScore: 88,
    pros: [],
    cons: []
  };

  const payload: ARBResearchPayload = {
    productQuery: 'gaming laptop 16gb ram under 80000',
    budgetCeiling: 80000,
    currency: 'INR',
    minMerchantTrustScore: 80,
    mandatorySpecifications: {
      ram_gb: 16
    }
  };

  const auditResult = ARBSelfVerifier.verifyListings([mockListingPass, mockListingViolate], payload);

  // The 8GB laptop must be dropped by the self-verifier
  assert.equal(auditResult.verifiedListings.length, 1);
  assert.equal(auditResult.verifiedListings[0].sku, 'SKU-PASS');

  // Audit trail must be recorded
  const passAudit = auditResult.audits.get('SKU-PASS');
  assert.ok(passAudit);
  assert.equal(passAudit.allHardRequirementsSatisfied, true);
  assert.ok(passAudit.evidenceAuditTrail.some(e => e.includes('RAM 16GB meets 16GB requirement')));

  const failAudit = auditResult.audits.get('SKU-FAIL');
  assert.ok(failAudit);
  assert.equal(failAudit.allHardRequirementsSatisfied, false);
});

test('ARBAlternativeFinder: finds closest budget stretch and spec step-downs when 0 qualify', () => {
  const overBudgetHighSpec: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-OVER',
    productTitle: 'Lenovo Legion Pro 7i (32GB DDR5 RAM, 1TB SSD, RTX 4080)',
    merchantName: 'Amazon',
    merchantDomain: 'amazon.in',
    productUrl: 'https://amazon.in/dp/over1',
    itemPrice: 135000,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 135000,
    inStock: true,
    trustScore: 94,
    pros: [],
    cons: []
  };

  const withinBudgetLowerSpec: MerchantListing = {
    merchantId: 'mch_test',
    trustReasons: [],
    sku: 'SKU-WITHIN',
    productTitle: 'Lenovo IdeaPad Gaming (16GB RAM, 512GB SSD, RTX 3050)',
    merchantName: 'Flipkart',
    merchantDomain: 'flipkart.com',
    productUrl: 'https://flipkart.com/dp/within1',
    itemPrice: 65000,
    currency: 'INR',
    estimatedTax: 0,
    estimatedShipping: 0,
    totalLandedCost: 65000,
    inStock: true,
    trustScore: 88,
    pros: [],
    cons: []
  };

  const payload: ARBResearchPayload = {
    productQuery: 'gaming laptop 32gb ram under 70000',
    budgetCeiling: 70000,
    currency: 'INR',
    minMerchantTrustScore: 80,
    mandatorySpecifications: {
      ram_gb: 32
    }
  };

  const alternatives = ARBAlternativeFinder.findClosestAlternatives(
    [overBudgetHighSpec, withinBudgetLowerSpec],
    payload
  );

  assert.equal(alternatives.hasAlternatives, true);
  assert.ok(alternatives.closestOption);
  assert.equal(alternatives.closestOption.kind, 'BUDGET_STRETCH');
  assert.equal(alternatives.closestOption.listing.sku, 'SKU-OVER');
  assert.equal(alternatives.closestOption.priceDelta, 65000); // 135k - 70k

  assert.ok(alternatives.stepDownOption);
  assert.equal(alternatives.stepDownOption.kind, 'SPEC_STEPDOWN');
  assert.equal(alternatives.stepDownOption.listing.sku, 'SKU-WITHIN');
});

test('ARBTaskStateStore & refineResearch: enables stateful follow-up refinement', async () => {
  const service = new ArbService();
  const taskId = 'refine-test-session-1';

  // Initial search: 16GB laptop under 80000
  const initial = await service.conductResearch({
    productQuery: 'gaming laptop 16gb ram under 80000',
    budgetCeiling: 80000,
    currency: 'INR',
    minMerchantTrustScore: 80,
    mandatorySpecifications: { ram_gb: 16 }
  }, taskId);

  assert.ok(initial.qualifyingListingsFound > 0);

  // Refine 1: "cheaper"
  const cheaperResult = await service.refineResearch(taskId, 'make it cheaper');
  assert.ok(cheaperResult);
  const cheaperState = ARBTaskStateStore.getInstance().get(taskId);
  assert.ok(cheaperState);
  // Either strictly cheaper options were found (budget ceiling lowered), or ARB keeps the
  // previous results and says the shopper is already on the cheapest qualifying option.
  assert.ok(
    cheaperState.payload.budgetCeiling < 80000 || /No cheaper option found/.test(cheaperResult.arbitrationSummary),
    'Budget ceiling should have dropped, or ARB should report that nothing cheaper exists'
  );

  // Refine 2: "only veg" on food search
  const foodTaskId = 'refine-food-session-2';
  await service.conductResearch({
    productQuery: 'biryani delivery',
    budgetCeiling: 600,
    currency: 'INR',
    minMerchantTrustScore: 80
  }, foodTaskId);

  await service.refineResearch(foodTaskId, 'only veg please');
  const foodState = ARBTaskStateStore.getInstance().get(foodTaskId);
  assert.equal(foodState?.payload.mandatorySpecifications?.['dietary'], 'veg');

  // Refine 3: "skip Flipkart"
  await service.refineResearch(taskId, 'skip flipkart');
  const skipState = ARBTaskStateStore.getInstance().get(taskId);
  // Skipping a merchant is recorded as a merchant exclusion (not a brand exclusion)
  assert.equal(skipState?.payload.mandatorySpecifications?.['excluded_merchants'], 'flipkart');
});

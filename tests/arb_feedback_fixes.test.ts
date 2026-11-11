import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import {
  ArbService,
  ARBQueryExtractor,
  ARBAmbiguityDetector,
  ARBTaskStateStore,
  ARBWebCrawler,
  ARBCurrencyConverter
} from '../ARB/index.js';

ARBWebCrawler.crawl = async () => [];
ARBCurrencyConverter.refreshRates = async () => {};

const arb = new ArbService();

// =============================================================================
// Item 1: No Test Shortcuts; Strict Budget Enforcement in Recommendations
// =============================================================================
test('Item 1: over-budget stretch options appear in alternatives section, never in topRecommendations, and refused by preparePurchase', async () => {
  const taskId = 'feedback-item1-test';
  const flexResult = await arb.conductResearch({
    productQuery: 'gaming laptop 16gb ram',
    budgetCeiling: 50000,
    currency: 'INR',
    budgetFlexibility: 'FLEXIBLE_10_PERCENT',
    mandatorySpecifications: { ram_gb: 16 }
  }, taskId);

  // Recommendations MUST NOT contain over-budget items
  assert.equal(flexResult.topRecommendations.length, 0);
  assert.equal(flexResult.qualifyingListingsFound, 0);

  // Alternatives section contains the 10% stretch option
  assert.ok(flexResult.arbitrationSummary.includes('Closest Realistic Alternatives Identified'));
  assert.ok(flexResult.arbitrationSummary.includes('MSI Thin 15'));
  assert.ok(flexResult.arbitrationSummary.includes('over your 50,000 INR budget'));

  // preparePurchase must strictly refuse over-budget listings
  const taskState = ARBTaskStateStore.getInstance().get(taskId);
  const overListing = taskState?.allScannedListings?.find(l => l.totalLandedCost > 50000 && l.productTitle.includes('MSI Thin 15'));
  assert.ok(overListing);
  assert.throws(
    () => arb.preparePurchase(overListing!, taskId),
    /exceeds task budget ceiling/
  );
});

// =============================================================================
// Item 2: No-Budget Queries Do Not Invent a Budget Ceiling in Reports
// =============================================================================
test('Item 2: queries with no budget stated do not invent a budget ceiling in report', async () => {
  for (const q of ['garlic naan', 'milk', 'amul butter', 'mac mini']) {
    const extracted = ARBQueryExtractor.extractFromText(q);
    assert.equal(extracted.noBudgetStated, true, `${q} should have noBudgetStated=true`);

    const payload = ARBQueryExtractor.toPayload(extracted);
    payload.allowAmbiguousGuess = true;
    const res = await arb.conductResearch(payload, `feedback-item2-${q.replace(/\s+/g, '-')}`);

    assert.doesNotMatch(
      res.arbitrationSummary,
      /below your 200,000/i,
      `Report for "${q}" should not invent a 200,000 budget ceiling: ${res.arbitrationSummary}`
    );
    assert.doesNotMatch(
      res.arbitrationSummary,
      /budget ceiling/i,
      `Report for "${q}" should not mention a budget ceiling when none was stated: ${res.arbitrationSummary}`
    );
  }
});

// =============================================================================
// Item 3: Budget Words (approx, approximately, roughly, about)
// =============================================================================
test('Item 3: budget extractor parses approx, approximately, roughly, and about with flexible budget', () => {
  const e1 = ARBQueryExtractor.extractFromText('laptop approx 50k');
  assert.equal(e1.budgetCeiling, 50000);
  assert.equal(e1.budgetFlexibility, 'FLEXIBLE_10_PERCENT');

  const e2 = ARBQueryExtractor.extractFromText('milk roughly 80');
  assert.equal(e2.budgetCeiling, 80);
  assert.equal(e2.budgetFlexibility, 'FLEXIBLE_10_PERCENT');

  const e3 = ARBQueryExtractor.extractFromText('milk about 80');
  assert.equal(e3.budgetCeiling, 80);
  assert.equal(e3.budgetFlexibility, 'FLEXIBLE_10_PERCENT');

  const e4 = ARBQueryExtractor.extractFromText('laptop approximately 60000');
  assert.equal(e4.budgetCeiling, 60000);
  assert.equal(e4.budgetFlexibility, 'FLEXIBLE_10_PERCENT');
});

// =============================================================================
// Item 4: Structural Accessory & Modifier Checks
// =============================================================================
test('Item 4: structural check blocks accessories and returns nothing unless listing contains noun', async () => {
  const accessoryQueries = [
    'pizza oven', 'pizza stone', 'pizza cutter',
    'laptop charger', 'laptop bag',
    'bread toaster', 'milk bottle', 'egg tray', 'egg beater',
    'burger box', 'naan tawa', 'ram cooler', 'ddr5 ram heatsink',
    'bandage scissors', 'mac mini dock', 'butter dish',
    'paracetamol syrup', 'bandage dress', 'ram mount for bike'
  ];

  for (const q of accessoryQueries) {
    const extracted = ARBQueryExtractor.extractFromText(q);
    const payload = ARBQueryExtractor.toPayload(extracted);
    payload.allowAmbiguousGuess = true;
    const res = await arb.conductResearch(payload, `feedback-item4-${q.replace(/[^a-z0-9]/gi, '-')}`);
    assert.equal(
      res.qualifyingListingsFound,
      0,
      `Query "${q}" should not match base products, but found ${res.qualifyingListingsFound} results: ${res.topRecommendations.map(l => l.productTitle).join(', ')}`
    );
  }

  // Legitimate product queries still return results
  const validQueries = ['garlic naan', 'pepperoni pizza', 'brown bread', 'crepe bandage', 'amul butter'];
  for (const q of validQueries) {
    const extracted = ARBQueryExtractor.extractFromText(q);
    const payload = ARBQueryExtractor.toPayload(extracted);
    payload.allowAmbiguousGuess = true;
    const res = await arb.conductResearch(payload, `feedback-valid-${q.replace(/[^a-z0-9]/gi, '-')}`);
    assert.ok(
      res.qualifyingListingsFound > 0,
      `Valid query "${q}" should return results`
    );
  }
});

// =============================================================================
// Item 5: Answering Clarifying Questions
// =============================================================================
test('Item 5: answering clarifying questions with keywords, spacing, or numeric index', async () => {
  // 1. "ram" answered with "laptop"
  const tRam1 = 'feedback-ans-ram-laptop';
  await arb.conductResearch({ productQuery: 'ram', budgetCeiling: 10000, currency: 'INR' }, tRam1);
  const rRam1 = await arb.answerResearch(tRam1, 'laptop');
  assert.ok(rRam1.qualifyingListingsFound > 0);
  assert.ok(rRam1.topRecommendations.every(l => /so-dimm|sodimm|laptop ram/i.test(l.productTitle)));

  // 2. "ram" answered with "ddr4"
  const tRam2 = 'feedback-ans-ram-ddr4';
  await arb.conductResearch({ productQuery: 'ram', budgetCeiling: 10000, currency: 'INR' }, tRam2);
  const rRam2 = await arb.answerResearch(tRam2, 'ddr4');
  assert.ok(rRam2.qualifyingListingsFound > 0);
  assert.ok(rRam2.topRecommendations.every(l => /ddr4/i.test(l.productTitle)));

  // 3. "bandage" answered with "crepe"
  const tBand1 = 'feedback-ans-band-crepe';
  await arb.conductResearch({ productQuery: 'bandage', budgetCeiling: 500, currency: 'INR' }, tBand1);
  const rBand1 = await arb.answerResearch(tBand1, 'crepe');
  assert.ok(rBand1.qualifyingListingsFound > 0);
  assert.ok(rBand1.topRecommendations.every(l => /crepe/i.test(l.productTitle)));

  // 4. "bandage" answered with "strips"
  const tBand2 = 'feedback-ans-band-strips';
  await arb.conductResearch({ productQuery: 'bandage', budgetCeiling: 500, currency: 'INR' }, tBand2);
  const rBand2 = await arb.answerResearch(tBand2, 'strips');
  assert.ok(rBand2.qualifyingListingsFound > 0);
  assert.ok(rBand2.topRecommendations.every(l => /strip|adhesive/i.test(l.productTitle)));

  // 5. "pizza" answered with "non veg" (with a space)
  const tPizza1 = 'feedback-ans-pizza-nonveg';
  await arb.conductResearch({ productQuery: 'pizza', budgetCeiling: 600, currency: 'INR' }, tPizza1);
  const rPizza1 = await arb.answerResearch(tPizza1, 'non veg');
  assert.ok(rPizza1.qualifyingListingsFound > 0);
  assert.ok(rPizza1.topRecommendations.every(l => !/margherita|paneer/i.test(l.productTitle)));

  // 6. Numeric selection: answering with "1"
  const tPizza2 = 'feedback-ans-pizza-num1';
  await arb.conductResearch({ productQuery: 'pizza', budgetCeiling: 600, currency: 'INR' }, tPizza2);
  const rPizza2 = await arb.answerResearch(tPizza2, '1');
  assert.ok(rPizza2.qualifyingListingsFound > 0);
  // Option 1 is Veg Pizza
  assert.ok(rPizza2.topRecommendations.some(l => /margherita|paneer|farmhouse/i.test(l.productTitle)));
});

// =============================================================================
// Item 6: Clarifying Questions Missed Phrasings
// =============================================================================
test('Item 6: conversational phrasing triggers ambiguity questions', () => {
  const check1 = ARBAmbiguityDetector.checkAmbiguity('mac mini please');
  assert.equal(check1.isAmbiguous, true);
  assert.ok(check1.question?.includes('Mac mini'));

  const check2 = ARBAmbiguityDetector.checkAmbiguity('memory stick for pc');
  assert.equal(check2.isAmbiguous, true);
  assert.ok(check2.question?.includes('type of RAM'));
});

// =============================================================================
// Item 7: Refinement Phrasings
// =============================================================================
test('Item 7: refinement handles just dominos, exclude dell, prefer asus only, 2 of them, actually i want eggs', async () => {
  const store = ARBTaskStateStore.getInstance();
  const taskId = 'feedback-refine-phrasings';

  await arb.conductResearch({
    productQuery: 'pizza',
    budgetCeiling: 500,
    currency: 'INR',
    allowAmbiguousGuess: true
  }, taskId);

  // 1. "just dominos"
  const r1 = store.applyRefinement(taskId, 'just dominos');
  assert.equal(r1.mandatorySpecifications['target_merchants'], 'dominos');

  // 2. "exclude dell"
  const r2 = store.applyRefinement(taskId, 'exclude dell');
  assert.ok(r2.excludedBrands?.includes('DELL'));

  // 3. "prefer asus only"
  const r3 = store.applyRefinement(taskId, 'prefer asus only');
  assert.deepEqual(r3.preferredBrands, ['Asus']);

  // 4. "2 of them"
  const r4 = store.applyRefinement(taskId, '2 of them');
  assert.equal(r4.quantity, 2);

  // 5. "actually i want eggs"
  const r5 = store.applyRefinement(taskId, 'actually i want eggs');
  assert.equal(r5.productQuery, 'eggs');
});

// =============================================================================
// Item 8: Relevance Misses (corsair 32gb & rtx 4060 laptop)
// =============================================================================
test('Item 8a: "corsair 32gb" returns Corsair 32GB RAM modules', async () => {
  const extracted = ARBQueryExtractor.extractFromText('corsair 32gb');
  assert.equal(extracted.category, 'pc_components');
  assert.equal(extracted.mandatorySpecifications['ram_gb'], 32);

  const payload = ARBQueryExtractor.toPayload(extracted);
  payload.allowAmbiguousGuess = true;
  const res = await arb.conductResearch(payload, 'feedback-corsair-32gb');
  assert.ok(res.qualifyingListingsFound > 0, 'Must find Corsair 32GB listings');
  assert.ok(res.topRecommendations.every(l => l.productTitle.toLowerCase().includes('corsair') && l.productTitle.includes('32GB')));
});

test('Item 8b: "rtx 4060 laptop" returns RTX 4060 laptops, never Intel Arc', async () => {
  const extracted = ARBQueryExtractor.extractFromText('rtx 4060 laptop');
  assert.equal(extracted.mandatorySpecifications['gpu'], 'RTX 4060');

  const payload = ARBQueryExtractor.toPayload(extracted);
  payload.allowAmbiguousGuess = true;
  const res = await arb.conductResearch(payload, 'feedback-rtx-4060-laptop');
  assert.ok(res.qualifyingListingsFound > 0, 'Must find RTX 4060 laptop');
  assert.ok(res.topRecommendations.every(l => /rtx\s*4060/i.test(l.productTitle)));
  assert.ok(!res.topRecommendations.some(l => /intel arc/i.test(l.productTitle)));
});

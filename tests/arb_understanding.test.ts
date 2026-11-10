import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARBQueryExtractor,
  ARBSpecNormalizer,
  ArbService,
  MultiMerchantCatalogProvider
} from '../ARB/index.js';
import { MockLLMProvider, SharedLLMGateway } from '../shared/llm/index.js';
import { MerchantListing } from '../shared/types/index.js';

test('ARBQueryExtractor: "iphone 15 128gb" extracts storage as 128GB, NOT ram_gb=128', () => {
  const req = ARBQueryExtractor.extractFromText('iphone 15 128gb');
  assert.equal(req.category, 'smartphones');
  assert.equal(req.mandatorySpecifications['storage'], '128GB');
  assert.equal(req.mandatorySpecifications['storage_gb'], 128);
  assert.equal(req.mandatorySpecifications['ram_gb'], undefined, 'Phone storage must not be misidentified as RAM');
});

test('ARBQueryExtractor: "band aid usd" detects USD currency without explicit budget number', () => {
  const req = ARBQueryExtractor.extractFromText('band aid usd');
  assert.equal(req.currency, 'USD', 'Standalone "usd" must set currency to USD');
  assert.equal(req.category, 'pharmacy');
});

test('ARBQueryExtractor: "2 pizzas" extracts quantity=2', () => {
  const req = ARBQueryExtractor.extractFromText('2 pizzas under 600 from dominos');
  assert.equal(req.quantity, 2, 'Numeric quantity must be extracted');
  assert.equal(req.budgetCeiling, 600);
  assert.ok(req.targetMerchants.includes('dominos'));

  const reqWords = ARBQueryExtractor.extractFromText('order two pizzas');
  assert.equal(reqWords.quantity, 2, 'Word-form quantity "two" must be extracted');
});

test('ARBQueryExtractor: separates hard must-haves from soft nice-to-haves ("16GB, ideally 32GB")', () => {
  const req = ARBQueryExtractor.extractFromText('gaming laptop 16gb, ideally 32gb under 90000');
  assert.equal(req.mandatorySpecifications['ram_gb'], 16, 'Mandatory RAM must be 16GB');
  assert.equal(req.softPreferences['ram_gb'], 32, 'Soft preference RAM must be 32GB');
});

test('ARBQueryExtractor: detects budget flexibility (strict vs flexible)', () => {
  const strict = ARBQueryExtractor.extractFromText('gaming laptop strictly under 75000');
  assert.equal(strict.budgetFlexibility, 'STRICT');

  const flexible = ARBQueryExtractor.extractFromText('laptop around 60k flexible');
  assert.equal(flexible.budgetFlexibility, 'FLEXIBLE_10_PERCENT');
});

test('ARBQueryExtractor: LLM extraction validates via Zod with fallback', async () => {
  // Register mock handler for test prompt
  const mockProvider = new MockLLMProvider();
  mockProvider.registerHandler('ultrabook 16gb', () => JSON.stringify({
    productQuery: 'ultrabook 16gb',
    category: 'laptops',
    quantity: 1,
    budget: { ceiling: 70000, currency: 'INR', flexibility: 'STRICT' },
    hardConstraints: { ram_gb: 16, storage_gb: 512 },
    softPreferences: { resolution: '2K QHD' },
    preferredBrands: ['Lenovo', 'HP'],
    excludedBrands: ['Acer'],
    targetMerchants: ['croma.com'],
    minMerchantTrustScore: 85
  }));

  const gateway = SharedLLMGateway.getInstance();
  const original = gateway.getProvider();
  gateway.setProvider(mockProvider);

  try {
    const res = await ARBQueryExtractor.extractWithLLM('ultrabook 16gb');
    assert.equal(res.category, 'laptops');
    assert.equal(res.mandatorySpecifications['ram_gb'], 16);
    assert.equal(res.mandatorySpecifications['storage_gb'], 512);
    assert.equal(res.softPreferences['resolution'], '2K QHD');
    assert.ok(res.preferredBrands.includes('Lenovo'));
    assert.ok(res.excludedBrands.includes('Acer'));
  } finally {
    gateway.setProvider(original);
  }
});

test('ARBSpecNormalizer: laptop storage parses 4-digit numbers (1024GB, 2048GB, 1TB, 2TB)', () => {
  const lap2048 = ARBSpecNormalizer.normalize('Lenovo Legion 5 (32GB DDR5, 2048GB SSD, RTX 4060)');
  assert.equal(lap2048.storageGb, 2048, '4-digit storage 2048GB must be parsed fully');

  const lap1tb = ARBSpecNormalizer.normalize('Dell XPS 15 (16GB RAM, 1TB NVMe SSD)');
  assert.equal(lap1tb.storageGb, 1024, '1TB must convert to 1024GB');

  const lap2tb = ARBSpecNormalizer.normalize('ASUS ROG Strix (32GB RAM, 2TB SSD)');
  assert.equal(lap2tb.storageGb, 2048, '2TB must convert to 2048GB');
});

test('ARBSpecNormalizer: enforces storage requirement and rejects insufficient capacity', () => {
  const specs = ARBSpecNormalizer.normalize('HP Pavilion (16GB RAM, 512GB SSD)');
  // User demands 1TB (1024GB)
  const check = ARBSpecNormalizer.satisfiesConstraints(specs, { storage: '1TB' });
  assert.equal(check.satisfied, false, '512GB must not satisfy 1TB requirement');
  assert.ok(check.failedReasons.some(r => r.includes('512GB is less than required 1024GB')));

  // User demands 512GB
  const checkPass = ARBSpecNormalizer.satisfiesConstraints(specs, { storage: '512GB' });
  assert.equal(checkPass.satisfied, true);
});

test('ARBSpecNormalizer: enforces resolution hierarchy and flags missing specs as unverified', () => {
  const fhdLaptop = ARBSpecNormalizer.normalize('Acer Nitro 15.6" 144Hz FHD Gaming Laptop');
  assert.equal(fhdLaptop.displayResolution, 'FHD');

  // Requesting 4K display on FHD laptop must fail
  const check4k = ARBSpecNormalizer.satisfiesConstraints(fhdLaptop, { resolution: '4K' });
  assert.equal(check4k.satisfied, false);
  assert.ok(check4k.failedReasons.some(r => r.includes('does not satisfy required 4K')));

  // Listing with unknown resolution must be marked unverified, not pass silently
  const noResSpecs = ARBSpecNormalizer.normalize('Generic 15.6 inch Core i5 Laptop');
  const checkUnverified = ARBSpecNormalizer.satisfiesConstraints(noResSpecs, { resolution: '1440P' });
  assert.ok(checkUnverified.unverifiedSpecs.some(u => u.includes('Display resolution')));
});

test('ARBSpecNormalizer: PC memory schema extracts DDR, speed, CL latency, and form factor', () => {
  const title = 'Corsair Vengeance 32GB DDR5 6000MHz CL30 Desktop Memory';
  const specs = ARBSpecNormalizer.normalize(title);

  assert.equal(specs.category, 'pc_memory');
  assert.equal(specs.ramGb, 32);
  assert.equal(specs.ramType, 'DDR5');
  assert.equal(specs.speedMhz, 6000);
  assert.equal(specs.cl, 30);
  assert.equal(specs.formFactor, 'desktop');

  // Enforce CL latency (lower is faster)
  const checkCl30 = ARBSpecNormalizer.satisfiesConstraints(specs, { cl: 30 });
  assert.equal(checkCl30.satisfied, true);

  // If user demanded max CL28, CL30 must fail
  const checkCl28 = ARBSpecNormalizer.satisfiesConstraints(specs, { cl: 28 });
  assert.equal(checkCl28.satisfied, false);
  assert.ok(checkCl28.failedReasons.some(r => r.includes('exceeds requested CL28')));
});

test('ARBSpecNormalizer: food delivery distinguishes veg vs non-veg constraints', () => {
  const chickenBiryani = ARBSpecNormalizer.normalize('Behrouz Hyderabadi Chicken Dum Biryani');
  assert.equal(chickenBiryani.dietary, 'non-veg');

  // Requesting vegetarian dish on chicken biryani must fail
  const checkVeg = ARBSpecNormalizer.satisfiesConstraints(chickenBiryani, { dietary: 'veg' });
  assert.equal(checkVeg.satisfied, false);
  assert.ok(checkVeg.failedReasons.some(r => r.includes('non-vegetarian')));

  const paneerBiryani = ARBSpecNormalizer.normalize('Behrouz Royal Paneer Dum Biryani');
  assert.equal(paneerBiryani.dietary, 'veg');
  const checkPaneer = ARBSpecNormalizer.satisfiesConstraints(paneerBiryani, { dietary: 'veg' });
  assert.equal(checkPaneer.satisfied, true);
});

test('ArbService: prioritizes preferredBrands in ranking and attaches pros', async () => {
  const arb = new ArbService();
  const payload = {
    productQuery: 'gaming laptop 16gb ram under 80000',
    budgetCeiling: 80000,
    currency: 'INR',
    preferredBrands: ['Lenovo'],
    mandatorySpecifications: { ram_gb: 16 }
  };

  const result = await arb.conductResearch(payload, 'test-pref-brand');
  assert.ok(result.qualifyingListingsFound > 0);
  const top = result.topRecommendations[0];
  assert.ok(
    top.productTitle.toLowerCase().includes('lenovo') || top.merchantName.toLowerCase().includes('lenovo'),
    'Preferred brand Lenovo must be ranked top recommendation'
  );
  assert.ok(
    top.pros.some(p => p.includes('preferred brand')),
    'Listing pros must highlight the preferred brand match'
  );
});

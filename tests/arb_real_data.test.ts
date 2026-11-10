import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARBProductVerifier,
  ARBCanonicalIdentity,
  ARBLandedCostCalculator,
  ArbService,
  ARBProposalBuilder
} from '../ARB/index.js';
import { MerchantListing } from '../shared/types/index.js';

test('ARBProductVerifier: parses schema.org Product and Offer JSON-LD', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Corsair Vengeance DDR5 32GB 6000MHz CL30 - Amazon.in</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Corsair Vengeance DDR5 32GB 6000MHz CL30 Desktop RAM",
          "brand": { "@type": "Brand", "name": "Corsair" },
          "model": "Vengeance",
          "sku": "CMK32GX5M2B6000C30",
          "offers": {
            "@type": "Offer",
            "price": "9499",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Appario Retail" }
          }
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const verified = ARBProductVerifier.extractFromHtml(sampleHtml, 'https://amazon.in/dp/B0C1234567');
  assert.ok(verified, 'Verification must succeed for valid JSON-LD');
  assert.equal(verified.price, 9499);
  assert.equal(verified.currency, 'INR');
  assert.equal(verified.inStock, true);
  assert.equal(verified.brand, 'Corsair');
  assert.equal(verified.sku, 'CMK32GX5M2B6000C30');
  assert.equal(verified.extractedVia, 'json-ld');
});

test('ARBProductVerifier: parses OpenGraph fallback metadata when JSON-LD is absent', () => {
  const metaHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="Sony WH-1000XM5 Wireless Headphones | Croma">
        <meta property="og:price:amount" content="26990">
        <meta property="og:price:currency" content="INR">
        <meta property="product:availability" content="in stock">
      </head>
      <body></body>
    </html>
  `;

  const verified = ARBProductVerifier.extractFromHtml(metaHtml, 'https://croma.com/p/12345');
  assert.ok(verified, 'Verification must succeed for OpenGraph metadata');
  assert.equal(verified.price, 26990);
  assert.equal(verified.currency, 'INR');
  assert.equal(verified.inStock, true);
  assert.equal(verified.extractedVia, 'opengraph');
});

test('ARBProductVerifier: rejects zero or negative prices and out-of-stock items are marked correctly', () => {
  const oosHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Out of Stock Graphics Card",
          "offers": {
            "@type": "Offer",
            "price": 45000,
            "priceCurrency": "INR",
            "availability": "https://schema.org/OutOfStock"
          }
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const verified = ARBProductVerifier.extractFromHtml(oosHtml, 'https://merchant.com/gpu');
  assert.ok(verified);
  assert.equal(verified.inStock, false, 'Out of stock status must be preserved');

  const zeroPriceHtml = `
    <html><head>
      <meta property="og:title" content="Free Sample">
      <meta property="og:price:amount" content="0">
    </head></html>
  `;
  const invalid = ARBProductVerifier.extractFromHtml(zeroPriceHtml, 'https://merchant.com/zero');
  assert.equal(invalid, null, 'Zero price offers must be rejected');
});

test('ARBProductVerifier: TTL caching stores and invalidates correctly', () => {
  ARBProductVerifier.clearCache();
  const url = 'https://amazon.in/dp/B0DCACHE1';
  const data = {
    url,
    title: 'Cached RAM',
    price: 8500,
    currency: 'INR',
    inStock: true,
    extractedVia: 'json-ld' as const,
    verifiedAt: new Date().toISOString()
  };

  ARBProductVerifier.setCache(url, data, 'pc_components');
  const cached = ARBProductVerifier.getCached(url);
  assert.ok(cached, 'Cached item must be retrieved');
  assert.equal(cached.price, 8500);

  // URL normalization strips query tracking
  const trackedUrl = 'https://amazon.in/dp/B0DCACHE1?utm_source=twitter&ref=sr_1_1';
  const cachedTracked = ARBProductVerifier.getCached(trackedUrl);
  assert.ok(cachedTracked, 'Tracking parameters must be stripped during cache lookup');
  assert.equal(cachedTracked.title, 'Cached RAM');
});

test('ARBCanonicalIdentity: distinguishes CL30 vs CL36 CAS latency variants', () => {
  const cl30Title = 'Corsair Vengeance 32GB DDR5 6000MHz CL30 Desktop RAM';
  const cl36Title = 'Corsair Vengeance 32GB DDR5 6000MHz CL36 Desktop RAM';

  const id30 = ARBCanonicalIdentity.extractIdentity(cl30Title);
  const id36 = ARBCanonicalIdentity.extractIdentity(cl36Title);

  assert.notEqual(id30.canonicalKey, id36.canonicalKey, 'CL30 and CL36 RAM must produce distinct canonical keys');
  assert.ok(id30.canonicalKey.includes('cl30'), 'id30 canonical key must contain cl30');
  assert.ok(id36.canonicalKey.includes('cl36'), 'id36 canonical key must contain cl36');
});

test('ARBCanonicalIdentity: matches the same product across different merchants', () => {
  const amazonTitle = 'Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz CL30 Desktop Memory';
  const mdComputersTitle = 'Corsair Vengeance DDR5 32GB 6000 CL30 Desktop RAM';

  const amazonId = ARBCanonicalIdentity.extractIdentity(amazonTitle);
  const mdId = ARBCanonicalIdentity.extractIdentity(mdComputersTitle);

  assert.equal(amazonId.canonicalKey, mdId.canonicalKey, 'Identical product across merchants must share canonical key');
  assert.equal(amazonId.brand, 'corsair');
});

test('ARBCanonicalIdentity: groupOffersByProduct identifies best price and calculates arbitration savings', () => {
  const listings: MerchantListing[] = [
    {
      merchantId: 'mch_amazon',
      merchantName: 'Amazon India',
      merchantDomain: 'amazon.in',
      productTitle: 'Corsair Vengeance 32GB DDR5 6000MHz CL30 Desktop RAM',
      productUrl: 'https://amazon.in/dp/B099999',
      sku: 'AMZ-COR-1',
      itemPrice: 9999,
      estimatedShipping: 0,
      estimatedTax: 0,
      totalLandedCost: 9999,
      currency: 'INR',
      inStock: true,
      trustScore: 92,
      trustReasons: ['Authorized retailer'],
      pros: [],
      cons: []
    },
    {
      merchantId: 'mch_mdcomp',
      merchantName: 'MD Computers',
      merchantDomain: 'mdcomputers.in',
      productTitle: 'Corsair Vengeance DDR5 32GB 6000 CL30 Desktop Memory',
      productUrl: 'https://mdcomputers.in/corsair-vengeance-32gb-cl30',
      sku: 'MDC-COR-1',
      itemPrice: 9499,
      estimatedShipping: 0,
      estimatedTax: 0,
      totalLandedCost: 9499,
      currency: 'INR',
      inStock: true,
      trustScore: 88,
      trustReasons: ['Specialist PC store'],
      pros: [],
      cons: []
    }
  ];

  const groups = ARBCanonicalIdentity.groupOffersByProduct(listings);
  assert.equal(groups.length, 1, 'Both listings must group into a single canonical product group');
  assert.equal(groups[0].merchantCount, 2);
  assert.equal(groups[0].bestListing.merchantName, 'MD Computers');
  assert.equal(groups[0].minLandedCost, 9499);
  assert.equal(groups[0].maxLandedCost, 9999);
  assert.equal(groups[0].arbitrationSavings, 500);
  assert.ok(
    groups[0].bestListing.pros.some(p => p.includes('saves 500 INR')),
    'Best listing pros must be augmented with verified arbitration savings'
  );
});

test('ARBLandedCostCalculator: applies e-commerce delivery fee threshold', () => {
  // Order below ₹499 threshold on Amazon.in
  const smallOrder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'amazon.in',
    itemPrice: 249,
    currency: 'INR'
  });
  assert.equal(smallOrder.shippingFee, 40, 'Orders under ₹499 must incur ₹40 standard shipping fee');
  assert.equal(smallOrder.totalLandedCost, 289);
  assert.equal(smallOrder.shippingConfirmed, true);

  // Order above ₹499 threshold on Amazon.in
  const largeOrder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'amazon.in',
    itemPrice: 1299,
    currency: 'INR'
  });
  assert.equal(largeOrder.shippingFee, 0, 'Orders over ₹499 must qualify for free shipping');
  assert.equal(largeOrder.totalLandedCost, 1299);
});

test('ARBLandedCostCalculator: food delivery calculates packaging, platform fee, and GST', () => {
  const foodOrder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'swiggy.com',
    itemPrice: 350,
    currency: 'INR'
  });

  assert.equal(foodOrder.packagingFee, 15, 'Packaging fee must be applied');
  assert.equal(foodOrder.platformFee, 5, 'Platform convenience fee must be applied');
  assert.ok(foodOrder.shippingFee > 0, 'Delivery fee must be applied');
  assert.ok(foodOrder.taxes > 0, '5% restaurant GST must be calculated');
  assert.equal(
    foodOrder.totalLandedCost,
    foodOrder.basePrice + foodOrder.shippingFee + foodOrder.packagingFee + foodOrder.platformFee + foodOrder.taxes
  );
});

test('ARBLandedCostCalculator: US store calculates estimated sales tax and shipping', () => {
  const usSmallOrder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'walmart.com',
    itemPrice: 20,
    currency: 'USD'
  });

  assert.equal(usSmallOrder.shippingFee, 6.99, 'Orders under $35 on Walmart must incur shipping');
  assert.equal(usSmallOrder.taxes, 1.5, '7.5% estimated US sales tax on $20 is $1.50');
  assert.equal(usSmallOrder.totalLandedCost, 28.49);

  const usLargeOrder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'walmart.com',
    itemPrice: 50,
    currency: 'USD'
  });
  assert.equal(usLargeOrder.shippingFee, 0, 'Orders over $35 qualify for free shipping');
});

test('ARBLandedCostCalculator: respects deliveryPostalCode and handles cross-border or invalid zones', () => {
  // Indian pincode for Swiggy
  const indianDelivery = ARBLandedCostCalculator.calculate({
    merchantDomain: 'swiggy.com',
    itemPrice: 300,
    currency: 'INR',
    deliveryPostalCode: '560001'
  });
  assert.equal(indianDelivery.pincodeServiced, true);
  assert.ok(indianDelivery.pincodeNote?.includes('560001'));

  // US ZIP for Swiggy quick-commerce
  const foreignDelivery = ARBLandedCostCalculator.calculate({
    merchantDomain: 'swiggy.com',
    itemPrice: 300,
    currency: 'INR',
    deliveryPostalCode: '94103'
  });
  assert.equal(foreignDelivery.pincodeServiced, false, 'Indian quick commerce cannot service US ZIP');

  // US Store shipping to Indian PIN (cross-border)
  const crossBorder = ARBLandedCostCalculator.calculate({
    merchantDomain: 'walmart.com',
    itemPrice: 10000,
    currency: 'INR',
    deliveryPostalCode: '560001'
  });
  assert.ok(crossBorder.customsDuty > 0, 'Cross-border electronics to India must include estimated customs duty');
  assert.ok(crossBorder.shippingFee > 0, 'Cross-border air freight shipping must be included');
});

test('PurchaseProposal builder accurately carries through landed cost breakdown', () => {
  const listing: MerchantListing = {
    merchantId: 'mch_amazon',
    merchantName: 'Amazon India',
    merchantDomain: 'amazon.in',
    productTitle: 'Hansaplast Washproof Bandages (Pack of 20)',
    productUrl: 'https://amazon.in/dp/B0EXAMPLE',
    sku: 'AMZ-HAN-1',
    itemPrice: 150,
    estimatedShipping: 40,
    estimatedTax: 0,
    totalLandedCost: 190,
    currency: 'INR',
    inStock: true,
    trustScore: 90,
    trustReasons: ['Verified merchant'],
    pros: ['Fast dispatch'],
    cons: []
  };

  const proposal = ARBProposalBuilder.buildProposal(listing, 'task-test-fee');
  assert.equal(proposal.pricingBreakdown.basePrice, 150);
  assert.equal(proposal.pricingBreakdown.shippingFee, 40);
  assert.equal(proposal.pricingBreakdown.taxes, 0);
  assert.equal(proposal.pricingBreakdown.totalPayable, 190);
  assert.equal(proposal.pricingBreakdown.totalPayable, listing.totalLandedCost);
});

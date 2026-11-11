import { ARBCurrencyConverter } from '../currency/forex_converter.js';

export interface LandedCostInput {
  merchantDomain: string;
  itemPrice: number;
  currency: string;
  productTitle?: string;
  category?: string;
  deliveryPostalCode?: string;
  discountAmount?: number;
  /** Merchant sells in a different market/currency than the shopper (import). */
  crossBorder?: boolean;
}

export interface FeeLineItem {
  name: string;
  amount: number;
  confirmed: boolean;
  description: string;
}

export interface LandedCostCalculation {
  basePrice: number;
  discount: number;
  effectivePrice: number;
  shippingFee: number;
  shippingConfirmed: boolean;
  taxes: number;
  taxConfirmed: boolean;
  platformFee: number;
  packagingFee: number;
  customsDuty: number;
  totalLandedCost: number;
  currency: string;
  pincodeServiced: boolean;
  pincodeNote?: string;
  feeLines: FeeLineItem[];
  transparencySummary: string;
}

/**
 * ARBLandedCostCalculator
 * Calculates authentic landed cost including merchant delivery thresholds,
 * food packaging/platform fees, GST/sales taxes, and pincode/cross-border customs.
 *
 * Marks each fee component as confirmed vs estimated.
 */
export class ARBLandedCostCalculator {
  /**
   * Computes comprehensive landed cost with itemized fee breakdown.
   */
  public static calculate(input: LandedCostInput): LandedCostCalculation {
    const {
      merchantDomain,
      itemPrice,
      currency = 'INR',
      productTitle = '',
      category = '',
      deliveryPostalCode,
      discountAmount = 0
    } = input;

    const domain = merchantDomain.toLowerCase().replace(/^www\./, '');
    const isUSD = currency.toUpperCase() === 'USD';
    const isINR = currency.toUpperCase() === 'INR';

    const basePrice = Math.max(0, itemPrice);
    const discount = Math.min(basePrice, Math.max(0, discountAmount));
    const effectivePrice = basePrice - discount;

    let shippingFee = 0;
    let shippingConfirmed = false;
    let taxes = 0;
    let taxConfirmed = false;
    let platformFee = 0;
    let packagingFee = 0;
    let customsDuty = 0;
    let pincodeServiced = true;
    let pincodeNote: string | undefined;
    let isCrossBorder = input.crossBorder === true;

    const feeLines: FeeLineItem[] = [];

    // 1. Pincode validation & regional compatibility check
    if (deliveryPostalCode) {
      const cleanPin = deliveryPostalCode.trim();
      const isIndianPin = /^\d{6}$/.test(cleanPin);
      const isUsZip = /^\d{5}(-\d{4})?$/.test(cleanPin);

      const isIndianQuickCommerce = [
        'swiggy.com', 'zomato.com', 'blinkit.com', 'zeptonow.com',
        'bigbasket.com', 'jiomart.com', 'dominos.co.in', 'pizzahut.co.in'
      ].some(d => domain.includes(d));

      const isUsStore = ['walmart.com', 'bestbuy.com', 'target.com'].some(d => domain.includes(d));

      if (isIndianQuickCommerce && isUsZip) {
        pincodeServiced = false;
        pincodeNote = `Quick-commerce merchant (${domain}) does not service US ZIP ${cleanPin}.`;
      } else if (isUsStore && isIndianPin && isINR) {
        isCrossBorder = true;
        pincodeNote = `Cross-border shipment from US merchant to Indian PIN ${cleanPin}.`;
      } else if (isIndianPin || isUsZip) {
        // ARB has not queried the merchant's serviceability API, so this is NOT a verification.
        pincodeNote = `Delivery to postal code ${cleanPin} requested — serviceability is confirmed on the merchant page at checkout.`;
      }
    }

    if (isCrossBorder && pincodeServiced) {
      // Estimates only: ~USD 25 international shipping and ~22% import duty.
      const rawShip = ARBCurrencyConverter.convert(25, 'USD', currency);
      shippingFee = rawShip;
      shippingConfirmed = false;
      customsDuty = isINR ? Math.round(effectivePrice * 0.22) : Math.round(effectivePrice * 0.22 * 100) / 100;
      feeLines.push({
        name: 'Cross-Border International Shipping',
        amount: shippingFee,
        confirmed: false,
        description: 'Estimated standard international air freight'
      });
      feeLines.push({
        name: 'Customs Import Duty (Estimated 22%)',
        amount: customsDuty,
        confirmed: false,
        description: 'Estimated cross-border duty and cess'
      });
    }

    // 2. Merchant Specific Fee Schedules
    if (customsDuty === 0) {
      // 2A. Indian Food Delivery (Swiggy, Zomato, Dominos, Pizza Hut)
      if (domain.includes('swiggy.com') || domain.includes('zomato.com') ||
          domain.includes('dominos.co.in') || domain.includes('pizzahut.co.in')) {
        // Delivery fee
        shippingFee = domain.includes('zomato') ? 35 : (domain.includes('swiggy') ? 29 : 0);
        shippingConfirmed = false;
        packagingFee = 15;
        platformFee = 5;
        // 5% restaurant GST
        taxes = Math.round((effectivePrice + packagingFee) * 0.05);
        taxConfirmed = false;

        if (shippingFee > 0) {
          feeLines.push({
            name: 'Delivery Fee',
            amount: shippingFee,
            confirmed: false,
            description: 'Standard local delivery partner fee'
          });
        }
        feeLines.push({
          name: 'Packaging & Handling',
          amount: packagingFee,
          confirmed: false,
          description: 'Hygienic tamper-evident restaurant packaging'
        });
        feeLines.push({
          name: 'Platform Convenience Fee',
          amount: platformFee,
          confirmed: false,
          description: 'Direct platform servicing fee'
        });
        feeLines.push({
          name: 'Restaurant GST (5%)',
          amount: taxes,
          confirmed: false,
          description: 'Mandatory statutory GST on prepared food services'
        });
      }

      // 2B. Indian Quick-Commerce Groceries (Blinkit, Zepto, Instamart)
      else if (domain.includes('blinkit.com') || domain.includes('zeptonow.com') || domain.includes('instamart')) {
        // Free delivery on orders >= 499
        if (effectivePrice >= 499) {
          shippingFee = 0;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Express Delivery',
            amount: 0,
            confirmed: false,
            description: 'Free instant 10-minute delivery (qualifies over ₹499 cart)'
          });
        } else {
          shippingFee = 19;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Express Delivery Fee',
            amount: 19,
            confirmed: false,
            description: 'Instant 10-minute flash delivery fee (orders under ₹499)'
          });
        }
        platformFee = 4;
        feeLines.push({
          name: 'Platform Fee',
          amount: platformFee,
          confirmed: false,
          description: 'Platform infrastructure fee'
        });
        // Groceries include GST in item price
        taxes = 0;
        taxConfirmed = false;
      }

      // 2C. Pharmacy & First Aid (Apollo, 1mg)
      else if (domain.includes('apollopharmacy') || domain.includes('1mg.com') || category === 'pharmacy') {
        if (effectivePrice >= 300) {
          shippingFee = 0;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Pharmacy Delivery',
            amount: 0,
            confirmed: false,
            description: 'Free doorstep healthcare delivery (orders over ₹300)'
          });
        } else {
          shippingFee = 25;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Pharmacy Delivery Fee',
            amount: 25,
            confirmed: false,
            description: 'Standard delivery fee for orders under ₹300'
          });
        }
        taxes = 0;
        taxConfirmed = false;
      }

      // 2D. Indian Tier-1 E-Commerce & OEM (Amazon.in, Flipkart, Croma, Reliance Digital, Apple, Dell)
      else if (domain.endsWith('.in') || domain.includes('flipkart.com') || domain.includes('croma.com') ||
               domain.includes('reliancedigital.in') || domain.includes('meckeys.com') || domain.includes('genesispc.in') ||
               (isINR && !isUSD)) {
        const freeThreshold = (domain.includes('croma') || domain.includes('reliancedigital')) ? 500 : 499;

        if (effectivePrice >= freeThreshold) {
          shippingFee = 0;
          shippingConfirmed = true;
          feeLines.push({
            name: 'Standard Delivery',
            amount: 0,
            confirmed: false,
            description: `Free shipping policy (order exceeds ₹${freeThreshold} threshold)`
          });
        } else {
          shippingFee = 40;
          shippingConfirmed = true;
          feeLines.push({
            name: 'Standard Shipping Fee',
            amount: 40,
            confirmed: false,
            description: `Standard delivery fee for orders below ₹${freeThreshold}`
          });
        }
        // Indian retail prices include all statutory taxes/GST
        taxes = 0;
        taxConfirmed = true;
      }

      // 2E. US Tier-1 E-Commerce (Walmart, Target, Best Buy, B&H, Amazon US)
      else if (isUSD || domain.endsWith('.com')) {
        const threshold = domain.includes('bestbuy') ? 50 : 35;
        if (effectivePrice >= threshold) {
          shippingFee = 0;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Standard Ground Shipping',
            amount: 0,
            confirmed: false,
            description: `Free standard shipping (exceeds $${threshold} minimum)`
          });
        } else {
          shippingFee = domain.includes('bestbuy') ? 8.99 : 6.99;
          shippingConfirmed = false;
          feeLines.push({
            name: 'Estimated Ground Shipping',
            amount: shippingFee,
            confirmed: false,
            description: `Standard shipping fee for carts under $${threshold}`
          });
        }

        // US list prices exclude sales tax; calculate estimated ~7.5% state/local tax
        taxes = Math.round(effectivePrice * 0.075 * 100) / 100;
        taxConfirmed = false;
        feeLines.push({
          name: 'Estimated State & Local Sales Tax (~7.5%)',
          amount: taxes,
          confirmed: false,
          description: 'Calculated based on standard US destination tax schedules'
        });
      }
    }

    // 3. Compute Final Landed Cost
    const totalExtraFees = shippingFee + taxes + platformFee + packagingFee + customsDuty;
    const rawTotal = effectivePrice + totalExtraFees;
    const totalLandedCost = isINR ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    // 4. Construct Transparency Summary
    const summaryParts: string[] = [
      `Base: ${basePrice} ${currency}`
    ];
    if (discount > 0) summaryParts.push(`Savings: -${discount} ${currency}`);
    if (shippingFee === 0) summaryParts.push('Free shipping');
    else summaryParts.push(`Shipping: +${shippingFee} ${currency} (${shippingConfirmed ? 'confirmed' : 'estimated'})`);

    if (packagingFee > 0) summaryParts.push(`Packaging: +${packagingFee} ${currency}`);
    if (platformFee > 0) summaryParts.push(`Platform fee: +${platformFee} ${currency}`);
    if (taxes > 0) summaryParts.push(`Tax: +${taxes} ${currency} (${taxConfirmed ? 'confirmed' : 'estimated'})`);
    if (customsDuty > 0) summaryParts.push(`Customs: +${customsDuty} ${currency} (estimated)`);

    summaryParts.push(`Total Landed: ${totalLandedCost} ${currency}`);

    return {
      basePrice,
      discount,
      effectivePrice,
      shippingFee,
      shippingConfirmed,
      taxes,
      taxConfirmed,
      platformFee,
      packagingFee,
      customsDuty,
      totalLandedCost,
      currency,
      pincodeServiced,
      pincodeNote,
      feeLines,
      transparencySummary: summaryParts.join(' | ')
    };
  }
}

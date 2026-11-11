/*
 * defender/rules.ts — deterministic pre-payment security checks.
 * Each function returns an array of detected threats (may be empty).
 */

import { DefenderAssessmentRequest, DefenderAssessmentResponse } from '../shared/types/index.js';

/**
 * In-memory velocity tracker: userId -> array of assessment timestamps (ms).
 * In production this would be a Redis sorted set, but we keep it in-process
 * per the "no new dependencies" rule.
 */
const velocityMap: Map<string, number[]> = new Map();

export interface Threat {
  type: string;
  severity: string;
  details: string;
}

/**
 * Check price tampering: totalPayable exceeds authorized max amount.
 */
export function checkPriceTampering(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal, approvalToken } = request;

  const totalPayable = Math.round(purchaseProposal.pricingBreakdown.totalPayable * 100) / 100;
  const authorizedMax = Math.round(approvalToken.authorizedMaxAmount * 100) / 100;

  if (totalPayable > authorizedMax) {
    threats.push({
      type: 'PRICE_TAMPERING',
      severity: 'CRITICAL',
      details: `Checkout amount ${totalPayable} exceeds authorized ceiling ${authorizedMax}`,
    });
  }

  return threats;
}

/**
 * Check currency mismatch between proposal and authorized token.
 */
export function checkCurrencyMismatch(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal, approvalToken } = request;

  const proposalCurrency =
    purchaseProposal.pricingBreakdown.currency.toUpperCase();
  const authorizedCurrency =
    approvalToken.authorizedCurrency.toUpperCase();

  if (proposalCurrency !== authorizedCurrency) {
    threats.push({
      type: 'PRICE_TAMPERING',
      severity: 'CRITICAL',
      details: `Currency '${proposalCurrency}' does not match authorized '${authorizedCurrency}'`,
    });
  }

  return threats;
}

/**
 * Check merchant domain mismatch (case-insensitive) between proposal and token.
 */
export function checkDomainMismatch(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal, approvalToken } = request;

  const proposalDomain = purchaseProposal.merchantDomain.toLowerCase();
  const authorizedDomain = approvalToken.authorizedMerchantDomain.toLowerCase();

  if (proposalDomain !== authorizedDomain) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'CRITICAL',
      details: `Merchant domain '${proposalDomain}' diverges from authorized '${authorizedDomain}'`,
    });
  }

  return threats;
}

/**
 * Check if the approval token has expired (either token-level or proposal-level).
 */
export function checkExpiry(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal, approvalToken } = request;

  const now = new Date();
  const proposalExpiresAt = new Date(purchaseProposal.expiresAt);
  const tokenExpiresAt = new Date(approvalToken.expiresAt);

  // Proposal expired in the past
  if (now > proposalExpiresAt) {
    threats.push({
      type: 'PRICE_TAMPERING',
      severity: 'HIGH',
      details: 'Purchase proposal has expired',
    });
  }

  // Token expired
  if (now > tokenExpiresAt) {
    threats.push({
      type: 'PRICE_TAMPERING',
      severity: 'HIGH',
      details: 'User approval token has expired',
    });
  }

  return threats;
}

/**
 * Check pricing breakdown consistency:
 * basePrice - discountApplied + shippingFee + taxes should equal totalPayable (within 0.01).
 */
export function checkPricingConsistency(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal } = request;

  const { basePrice, discountApplied, shippingFee, taxes, totalPayable } = purchaseProposal.pricingBreakdown;

  const computedTotal = Math.round((basePrice - discountApplied + shippingFee + taxes) * 100) / 100;
  const payableTotal = Math.round(totalPayable * 100) / 100;

  const diff = Math.abs(computedTotal - payableTotal);
  if (diff > 0.01) {
    threats.push({
      type: 'PRICE_TAMPERING',
      severity: 'HIGH',
      details: `Pricing inconsistency: computed ${computedTotal} vs payable ${payableTotal} (diff ${diff})`,
    });
  }

  return threats;
}

/**
 * Check abnormal velocity: more than 5 assessments for the same userId in 60 seconds.
 */
export function checkAbnormalVelocity(
  request: DefenderAssessmentRequest
): Threat[] {
  const threats: Threat[] = [];
  const { purchaseProposal, approvalToken } = request;
  const userId = approvalToken.userId;
  const now = Date.now();

  if (!userId) return threats;

  const timestamps = velocityMap.get(userId) || [];

  // Remove timestamps older than 60 seconds
  const recent = timestamps.filter(ts => now - ts < 60_000);

  // If there are already 5 or more recent assessments, flag abnormal velocity
  if (recent.length >= 5) {
    threats.push({
      type: 'ABNORMAL_VELOCITY',
      severity: 'HIGH',
      details: `User ${userId} has ${recent.length} assessments in the last 60 seconds`,
    });
  }

  // Record this assessment's timestamp
  recent.push(now);
  velocityMap.set(userId, recent);

  return threats;
}

/**
 * Run all deterministic rule checks and return combined threats.
 */
export function runAllRules(
  request: DefenderAssessmentRequest
): Threat[] {
  return [
    checkPriceTampering(request),
    checkCurrencyMismatch(request),
    checkDomainMismatch(request),
    checkExpiry(request),
    checkPricingConsistency(request),
    checkAbnormalVelocity(request),
  ].flat();
}
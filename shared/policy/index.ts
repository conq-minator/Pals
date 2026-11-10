import {
  UserApprovalToken,
  PurchaseProposal,
  PolicyValidationResult
} from '../types/index.js';

export interface UserFinancialPolicy {
  userId: string;
  maxSinglePurchaseLimit: number;
  dailySpendingLimit: number;
  currentDailySpent: number;
  preferredCurrency: string;
  merchantAllowlist?: string[];
  merchantBlocklist?: string[];
  minMerchantTrustScore: number;
}

export class DeterministicPolicyEngine {
  /**
   * Converts monetary amounts to integer minor units (paise/cents) to prevent floating-point inaccuracies.
   */
  private static toMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Validates a PurchaseProposal against user-defined financial constraints.
   */
  public static validateProposalAgainstPolicy(
    proposal: PurchaseProposal,
    policy: UserFinancialPolicy
  ): PolicyValidationResult {
    const proposalMinor = this.toMinorUnits(proposal.pricingBreakdown.totalPayable);
    const maxSingleMinor = this.toMinorUnits(policy.maxSinglePurchaseLimit);
    const dailyLimitMinor = this.toMinorUnits(policy.dailySpendingLimit);
    const currentDailyMinor = this.toMinorUnits(policy.currentDailySpent);

    // 1. Currency Check
    if (proposal.pricingBreakdown.currency.toUpperCase() !== policy.preferredCurrency.toUpperCase()) {
      return {
        valid: false,
        code: 'CURRENCY_MISMATCH',
        reason: `Currency '${proposal.pricingBreakdown.currency}' does not match user preferred currency '${policy.preferredCurrency}'`
      };
    }

    // 2. Single Purchase Limit Check
    if (proposalMinor > maxSingleMinor) {
      return {
        valid: false,
        code: 'EXCEEDS_SINGLE_LIMIT',
        reason: `Proposal total ${proposal.pricingBreakdown.totalPayable} ${proposal.pricingBreakdown.currency} exceeds single purchase ceiling of ${policy.maxSinglePurchaseLimit}`
      };
    }

    // 3. Daily Spending Limit Check
    if (currentDailyMinor + proposalMinor > dailyLimitMinor) {
      return {
        valid: false,
        code: 'EXCEEDS_DAILY_LIMIT',
        reason: `Transaction of ${proposal.pricingBreakdown.totalPayable} would push daily spend to ${(currentDailyMinor + proposalMinor) / 100}, exceeding daily cap of ${policy.dailySpendingLimit}`
      };
    }

    // 4. Merchant Blocklist Check
    const domain = proposal.merchantDomain.toLowerCase();
    if (policy.merchantBlocklist && policy.merchantBlocklist.some(b => domain.includes(b.toLowerCase()))) {
      return {
        valid: false,
        code: 'BLOCKED_MERCHANT',
        reason: `Merchant '${proposal.merchantDomain}' is on the user blocklist`
      };
    }

    // 5. Merchant Allowlist Check (if configured)
    if (policy.merchantAllowlist && policy.merchantAllowlist.length > 0) {
      const isAllowed = policy.merchantAllowlist.some(a => domain.includes(a.toLowerCase()));
      if (!isAllowed) {
        return {
          valid: false,
          code: 'BLOCKED_MERCHANT',
          reason: `Merchant '${proposal.merchantDomain}' is not present on user allowlist`
        };
      }
    }

    return { valid: true, code: 'OK' };
  }

  /**
   * Validates that an executed checkout matches the user-signed UserApprovalToken.
   * Hard Invariant: Final payable amount <= authorizedMaxAmount (not even +0.01 permitted).
   */
  public static validateApprovalTokenForPayment(
    token: UserApprovalToken,
    orderTotal: number,
    orderCurrency: string,
    merchantDomain: string
  ): PolicyValidationResult {
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);

    // 1. Expiration check
    if (now > expiresAt) {
      return {
        valid: false,
        code: 'EXPIRED_TOKEN',
        reason: `User approval token expired at ${token.expiresAt}`
      };
    }

    // 2. Currency check
    if (orderCurrency.toUpperCase() !== token.authorizedCurrency.toUpperCase()) {
      return {
        valid: false,
        code: 'CURRENCY_MISMATCH',
        reason: `Payment currency '${orderCurrency}' does not match authorized currency '${token.authorizedCurrency}'`
      };
    }

    // 3. Domain match check
    if (merchantDomain.toLowerCase() !== token.authorizedMerchantDomain.toLowerCase()) {
      return {
        valid: false,
        code: 'DOMAIN_MISMATCH',
        reason: `Payment merchant domain '${merchantDomain}' diverged from authorized domain '${token.authorizedMerchantDomain}'`
      };
    }

    // 4. Hard Amount Ceiling Invariant (Integer cents comparison)
    const orderTotalMinor = this.toMinorUnits(orderTotal);
    const authorizedMaxMinor = this.toMinorUnits(token.authorizedMaxAmount);

    if (orderTotalMinor > authorizedMaxMinor) {
      return {
        valid: false,
        code: 'EXCEEDS_SINGLE_LIMIT',
        reason: `Order total ${orderTotal} exceeds cryptographically authorized ceiling of ${token.authorizedMaxAmount} (Price increase detected - re-approval required)`
      };
    }

    return { valid: true, code: 'OK' };
  }
}


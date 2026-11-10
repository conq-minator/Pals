import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';

export interface ClosestAlternative {
  listing: MerchantListing;
  kind: 'BUDGET_STRETCH' | 'SPEC_STEPDOWN' | 'ALTERNATIVE_BRAND';
  explanation: string;
  priceDelta: number;
}

export interface ClosestAlternativesReport {
  hasAlternatives: boolean;
  closestOption?: ClosestAlternative;
  stepDownOption?: ClosestAlternative;
  recommendationText: string;
}

/**
 * ARBAlternativeFinder
 * Automatically discovers closest alternatives when no listings satisfy all constraints.
 * Relaxes one constraint at a time (e.g. budget stretch or spec step-down) to provide actionable guidance.
 */
export class ARBAlternativeFinder {
  /**
   * Scans rejected listings and finds closest realistic alternatives.
   */
  public static findClosestAlternatives(
    scannedListings: MerchantListing[],
    payload: ARBResearchPayload
  ): ClosestAlternativesReport {
    if (!scannedListings || scannedListings.length === 0) {
      return {
        hasAlternatives: false,
        recommendationText: 'No merchant listings available to formulate alternatives.'
      };
    }

    const { budgetCeiling, currency, mandatorySpecifications } = payload;
    let closestBudgetStretch: ClosestAlternative | undefined;
    let closestSpecStepDown: ClosestAlternative | undefined;

    // 1. Find closest option that satisfies hardware specs but exceeds budget
    const specMatchingOverBudget = scannedListings
      .filter(l => l.totalLandedCost > budgetCeiling)
      .filter(l => {
        if (!mandatorySpecifications || Object.keys(mandatorySpecifications).length === 0) return true;
        const specs = ARBSpecNormalizer.normalize(l.productTitle, undefined, payload.category);
        const check = ARBSpecNormalizer.satisfiesConstraints(specs, mandatorySpecifications, payload.category);
        return check.satisfied;
      })
      .sort((a, b) => a.totalLandedCost - b.totalLandedCost);

    if (specMatchingOverBudget.length > 0) {
      const best = specMatchingOverBudget[0];
      const delta = best.totalLandedCost - budgetCeiling;
      closestBudgetStretch = {
        listing: best,
        kind: 'BUDGET_STRETCH',
        explanation: `Meets all hardware specifications at ${best.totalLandedCost.toLocaleString()} ${currency} (+${delta.toLocaleString()} ${currency} over budget)`,
        priceDelta: delta
      };
    }

    // 2. Find best option within budget that relaxes one hardware requirement (e.g. 16GB instead of 32GB)
    const withinBudget = scannedListings
      .filter(l => l.totalLandedCost <= budgetCeiling)
      .sort((a, b) => b.trustScore - a.trustScore || a.totalLandedCost - b.totalLandedCost);

    if (withinBudget.length > 0) {
      const bestWithin = withinBudget[0];
      const delta = budgetCeiling - bestWithin.totalLandedCost;
      closestSpecStepDown = {
        listing: bestWithin,
        kind: 'SPEC_STEPDOWN',
        explanation: `Fits within budget at ${bestWithin.totalLandedCost.toLocaleString()} ${currency} (${delta.toLocaleString()} ${currency} under budget), with entry specifications`,
        priceDelta: -delta
      };
    }

    // 3. Construct guidance text
    const lines: string[] = [];
    if (closestBudgetStretch) {
      lines.push(`- **Closest match to your specs:** [${closestBudgetStretch.listing.productTitle}](${closestBudgetStretch.listing.productUrl}) at **${closestBudgetStretch.listing.totalLandedCost.toLocaleString()} ${currency}** on ${closestBudgetStretch.listing.merchantName} (+${closestBudgetStretch.priceDelta.toLocaleString()} ${currency} over your ${budgetCeiling.toLocaleString()} ${currency} budget).`);
    }
    if (closestSpecStepDown) {
      lines.push(`- **Best alternative within your budget:** [${closestSpecStepDown.listing.productTitle}](${closestSpecStepDown.listing.productUrl}) at **${closestSpecStepDown.listing.totalLandedCost.toLocaleString()} ${currency}** on ${closestSpecStepDown.listing.merchantName}.`);
    }

    return {
      hasAlternatives: closestBudgetStretch !== undefined || closestSpecStepDown !== undefined,
      closestOption: closestBudgetStretch,
      stepDownOption: closestSpecStepDown,
      recommendationText: lines.join('\n')
    };
  }
}

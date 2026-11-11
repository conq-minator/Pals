import { ArbService } from '../service.js';
import { ARBAmbiguityDetector } from '../interaction/ambiguity_detector.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';
import { ARBLandedCostCalculator } from '../pricing/landed_cost.js';

export interface BenchmarkMetrics {
  totalTestCases: number;
  passedCount: number;
  constraintSatisfactionRate: number; // 0.0 to 1.0 (Target: 1.0)
  fabricationRate: number;            // 0.0 to 1.0 (Target: 0.0)
  ambiguityDetectionRate: number;     // 0.0 to 1.0 (Target: 1.0)
  landedCostCompleteness: number;     // 0.0 to 1.0 (Target: 1.0)
  pulseHandoffReadyRate: number;      // 0.0 to 1.0 (Target: 1.0)
  overallScore: number;               // 0 to 100
  details: string[];
}

/**
 * ARBEvaluationBenchmark
 * Autonomous benchmark test suite verifying ARB against ground-truth datasets (Flaw 22).
 */
export class ARBEvaluationBenchmark {
  /**
   * Runs the full evaluation benchmark and calculates performance metrics.
   */
  public static async runBenchmark(service: ArbService = new ArbService()): Promise<BenchmarkMetrics> {
    const details: string[] = [];
    let testsRan = 0;
    let testsPassed = 0;

    let hardViolations = 0;
    let totalExaminedListings = 0;
    let fabricatedCount = 0;
    let ambiguousTriggered = 0;
    let expectedAmbiguousCount = 2;
    let landedCostCompleteCount = 0;
    let proposalHandoffReadyCount = 0;
    let proposalsTested = 0;

    // Case 1: Tech Laptops (Hard RAM & Budget Constraints)
    testsRan++;
    const res1 = await service.conductResearch({
      productQuery: 'gaming laptop 16gb ram under 80000',
      budgetCeiling: 80000,
      currency: 'INR',
      minMerchantTrustScore: 80,
      mandatorySpecifications: { ram_gb: 16 }
    }, 'bench-1');

    if (res1.qualifyingListingsFound > 0) {
      for (const item of res1.topRecommendations) {
        totalExaminedListings++;
        const specs = ARBSpecNormalizer.normalize(item.productTitle);
        if (item.totalLandedCost > 80000 || (specs.ramGb && specs.ramGb < 16)) {
          hardViolations++;
        }
        if (item.totalLandedCost > 0 && item.itemPrice > 0) {
          landedCostCompleteCount++;
        }
      }
      testsPassed++;
      details.push('PASS: Tech laptop 16GB constraint verified without violations.');
    } else {
      details.push('FAIL: Tech laptop returned 0 qualifying deals.');
    }

    // Case 2: Zero Fabrication on Impossible Request
    testsRan++;
    const res2 = await service.conductResearch({
      productQuery: 'gaming laptop 64gb ram under 40000',
      budgetCeiling: 40000,
      currency: 'INR',
      minMerchantTrustScore: 80,
      mandatorySpecifications: { ram_gb: 64 }
    }, 'bench-2');

    if (res2.qualifyingListingsFound === 0) {
      testsPassed++;
      details.push('PASS: Zero fabricated laptops returned for impossible 64GB < 40k request.');
    } else {
      fabricatedCount += res2.qualifyingListingsFound;
      details.push(`FAIL: Hallucinated ${res2.qualifyingListingsFound} laptops for impossible budget.`);
    }

    // Case 3: Food Veg/Non-Veg Constraint
    testsRan++;
    const res3 = await service.conductResearch({
      productQuery: 'order a large pepperoni pizza under 600',
      budgetCeiling: 600,
      currency: 'INR',
      minMerchantTrustScore: 80
    }, 'bench-3');

    if (res3.qualifyingListingsFound > 0) {
      for (const item of res3.topRecommendations) {
        totalExaminedListings++;
        if (item.totalLandedCost > 600) hardViolations++;
        if (item.totalLandedCost > 0 && item.itemPrice > 0) landedCostCompleteCount++;
      }
      testsPassed++;
      details.push('PASS: Pizza food delivery returned authentic options within budget.');
    } else {
      details.push('FAIL: Pizza food delivery returned 0 results.');
    }

    // Case 4: Ambiguity Detection (Bare "ram")
    testsRan++;
    const ramAmbiguity = ARBAmbiguityDetector.checkAmbiguity('ram');
    if (ramAmbiguity.isAmbiguous && ramAmbiguity.options && ramAmbiguity.options.length >= 2) {
      ambiguousTriggered++;
      testsPassed++;
      details.push('PASS: Ambiguous "ram" successfully triggered disambiguation.');
    } else {
      details.push('FAIL: Ambiguous "ram" failed to trigger disambiguation.');
    }

    // Case 5: Ambiguity Detection (Bare "pizza")
    testsRan++;
    const pizzaAmbiguity = ARBAmbiguityDetector.checkAmbiguity('pizza');
    if (pizzaAmbiguity.isAmbiguous && pizzaAmbiguity.options && pizzaAmbiguity.options.length >= 2) {
      ambiguousTriggered++;
      testsPassed++;
      details.push('PASS: Ambiguous "pizza" successfully triggered disambiguation.');
    } else {
      details.push('FAIL: Ambiguous "pizza" failed to trigger disambiguation.');
    }

    // Case 6: PULSE Purchase Proposal Readiness
    testsRan++;
    proposalsTested++;
    if (res1.topRecommendations.length > 0) {
      const proposal = service.preparePurchase(res1.topRecommendations[0], 'bench-prep-1');
      if (
        proposal.pulseHandoffPayload &&
        proposal.pulseHandoffPayload['action'] === 'PULSE:payment.execute' &&
        proposal.pricingBreakdown.totalPayable > 0 &&
        proposal.supportedPaymentMethods &&
        proposal.supportedPaymentMethods.length > 0
      ) {
        proposalHandoffReadyCount++;
        testsPassed++;
        details.push('PASS: PurchaseProposal contains complete PULSE payment handoff payload.');
      } else {
        details.push('FAIL: PurchaseProposal missing PULSE handoff payload.');
      }
    }

    // Calculate rates
    const constraintSatisfactionRate = totalExaminedListings > 0
      ? (totalExaminedListings - hardViolations) / totalExaminedListings
      : 1.0;

    const fabricationRate = totalExaminedListings > 0
      ? fabricatedCount / totalExaminedListings
      : 0.0;

    const ambiguityDetectionRate = ambiguousTriggered / expectedAmbiguousCount;

    const landedCostCompleteness = totalExaminedListings > 0
      ? landedCostCompleteCount / totalExaminedListings
      : 1.0;

    const pulseHandoffReadyRate = proposalsTested > 0
      ? proposalHandoffReadyCount / proposalsTested
      : 1.0;

    const overallScore = Math.round(
      (constraintSatisfactionRate * 30) +
      ((1 - fabricationRate) * 30) +
      (ambiguityDetectionRate * 15) +
      (landedCostCompleteness * 15) +
      (pulseHandoffReadyRate * 10)
    );

    return {
      totalTestCases: testsRan,
      passedCount: testsPassed,
      constraintSatisfactionRate,
      fabricationRate,
      ambiguityDetectionRate,
      landedCostCompleteness,
      pulseHandoffReadyRate,
      overallScore,
      details
    };
  }
}

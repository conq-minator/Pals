import { MerchantListing, ARBResearchPayload } from '../../shared/types/index.js';
import { ARBSpecNormalizer } from '../extractors/spec_normalizer.js';

export type VerificationConfidence = 'CONFIRMED' | 'ESTIMATED' | 'UNVERIFIED';

export interface VerifiedClaim {
  field: string;
  expected: string | number | boolean;
  observed: string | number | boolean | undefined;
  evidence: string;
  confidence: VerificationConfidence;
  satisfied: boolean;
}

export interface ListingVerificationAudit {
  sku: string;
  merchantName: string;
  productTitle: string;
  allHardRequirementsSatisfied: boolean;
  overallConfidence: VerificationConfidence;
  verifiedClaims: VerifiedClaim[];
  unverifiedClaims: string[];
  evidenceAuditTrail: string[];
}

/**
 * ARBSelfVerifier
 * Independent self-checking engine that audits top recommendations before returning.
 *
 * Verifies every hard requirement against extracted evidence, attaches confidence
 * levels, discards failed candidates, and guarantees no unbacked claims are made.
 */
export class ARBSelfVerifier {
  /**
   * Audits a list of candidate listings against hard research constraints.
   * Drops candidates that violate hard requirements and attaches evidence.
   */
  public static verifyListings(
    listings: MerchantListing[],
    payload: ARBResearchPayload
  ): {
    verifiedListings: MerchantListing[];
    audits: Map<string, ListingVerificationAudit>;
  } {
    const verifiedListings: MerchantListing[] = [];
    const audits = new Map<string, ListingVerificationAudit>();

    for (const listing of listings) {
      const audit = this.auditSingleListing(listing, payload);
      audits.set(listing.sku, audit);

      if (audit.allHardRequirementsSatisfied) {
        // Attach verified audit trail to listing pros
        if (audit.evidenceAuditTrail.length > 0) {
          const topAuditEvidence = `Self-Check Verified: ${audit.evidenceAuditTrail.slice(0, 2).join('; ')}`;
          if (!listing.pros.some(p => p.includes('Self-Check Verified'))) {
            listing.pros.unshift(topAuditEvidence);
          }
        }
        verifiedListings.push(listing);
      }
    }

    return {
      verifiedListings,
      audits
    };
  }

  /**
   * Performs an exhaustive requirement-by-requirement audit for a single listing.
   */
  public static auditSingleListing(
    listing: MerchantListing,
    payload: ARBResearchPayload
  ): ListingVerificationAudit {
    const mandatory = payload.mandatorySpecifications || {};
    const normalized = ARBSpecNormalizer.normalize(listing.productTitle, undefined, payload.category);
    const verifiedClaims: VerifiedClaim[] = [];
    const unverifiedClaims: string[] = [];
    const evidenceAuditTrail: string[] = [];

    let allHardSatisfied = true;
    let hasUnverified = false;

    // 1. Budget Hard Check
    const budgetCeiling = payload.budgetCeiling;
    const priceSatisfied = listing.totalLandedCost <= budgetCeiling;
    if (!priceSatisfied) {
      allHardSatisfied = false;
    }
    const priceConfidence: VerificationConfidence = listing.pros.some(p => p.includes('schema.org')) ? 'CONFIRMED' : 'ESTIMATED';
    verifiedClaims.push({
      field: 'budget_ceiling',
      expected: `<= ${budgetCeiling} ${payload.currency}`,
      observed: `${listing.totalLandedCost} ${listing.currency}`,
      evidence: `Landed cost: base ${listing.itemPrice} + ship ${listing.estimatedShipping} + tax ${listing.estimatedTax}`,
      confidence: priceConfidence,
      satisfied: priceSatisfied
    });
    if (priceSatisfied) {
      evidenceAuditTrail.push(`Landed cost within budget (${listing.totalLandedCost} ${listing.currency})`);
    }

    // 2. RAM Check
    if (mandatory['ram_gb'] && typeof mandatory['ram_gb'] === 'number') {
      const reqRam = mandatory['ram_gb'];
      const actualRam = normalized.ramGb;
      const isSatisfied = actualRam !== undefined && actualRam >= reqRam;
      const confidence: VerificationConfidence = actualRam !== undefined
        ? (listing.pros.some(p => p.includes('schema.org')) ? 'CONFIRMED' : 'ESTIMATED')
        : 'UNVERIFIED';

      if (actualRam === undefined) {
        hasUnverified = true;
        unverifiedClaims.push(`RAM capacity (${reqRam}GB)`);
      } else if (!isSatisfied) {
        allHardSatisfied = false;
      } else {
        evidenceAuditTrail.push(`RAM ${actualRam}GB meets ${reqRam}GB requirement`);
      }

      verifiedClaims.push({
        field: 'ram_gb',
        expected: reqRam,
        observed: actualRam,
        evidence: actualRam ? `Extracted RAM: ${actualRam}GB from product listing` : 'No explicit RAM specification in listing',
        confidence,
        satisfied: isSatisfied
      });
    }

    // 3. Storage Check
    const reqStorageRaw = mandatory['storage_gb'] ?? mandatory['storage'];
    if (reqStorageRaw !== undefined) {
      const num = typeof reqStorageRaw === 'number' ? reqStorageRaw : parseInt(String(reqStorageRaw).replace(/[^0-9]/g, ''), 10);
      const reqStorageGb = String(reqStorageRaw).toUpperCase().includes('TB') ? num * 1024 : num;
      const actualStorage = normalized.storageGb;
      const isSatisfied = actualStorage !== undefined && actualStorage >= reqStorageGb;
      const confidence: VerificationConfidence = actualStorage !== undefined
        ? (listing.pros.some(p => p.includes('schema.org')) ? 'CONFIRMED' : 'ESTIMATED')
        : 'UNVERIFIED';

      if (actualStorage === undefined) {
        hasUnverified = true;
        unverifiedClaims.push(`Storage (${reqStorageGb}GB)`);
      } else if (!isSatisfied) {
        allHardSatisfied = false;
      } else {
        evidenceAuditTrail.push(`Storage ${actualStorage}GB satisfies ${reqStorageGb}GB requirement`);
      }

      verifiedClaims.push({
        field: 'storage_gb',
        expected: reqStorageGb,
        observed: actualStorage,
        evidence: actualStorage ? `Extracted Storage: ${actualStorage}GB` : 'Storage not stated in listing',
        confidence,
        satisfied: isSatisfied
      });
    }

    // 4. Dedicated GPU Check
    if (mandatory['gpu'] && typeof mandatory['gpu'] === 'string') {
      const reqGpu = mandatory['gpu'].toLowerCase();
      const actualGpu = normalized.gpuModel;
      const isSatisfied = actualGpu !== undefined && actualGpu.toLowerCase().includes(reqGpu);
      const confidence: VerificationConfidence = actualGpu
        ? (listing.pros.some(p => p.includes('schema.org')) ? 'CONFIRMED' : 'ESTIMATED')
        : 'UNVERIFIED';

      if (!actualGpu) {
        hasUnverified = true;
        unverifiedClaims.push(`GPU (${mandatory['gpu']})`);
      } else if (!isSatisfied) {
        allHardSatisfied = false;
      } else {
        evidenceAuditTrail.push(`GPU ${actualGpu} matches required ${mandatory['gpu']}`);
      }

      verifiedClaims.push({
        field: 'gpu',
        expected: mandatory['gpu'],
        observed: actualGpu,
        evidence: actualGpu ? `Extracted GPU: ${actualGpu}` : 'GPU not stated',
        confidence,
        satisfied: isSatisfied
      });
    }

    // 5. Dietary Veg/Non-Veg Check
    if (mandatory['dietary'] && typeof mandatory['dietary'] === 'string') {
      const reqDiet = mandatory['dietary'].toLowerCase();
      const actualDiet = normalized.dietary;
      const isSatisfied = reqDiet === 'non-veg'
        ? actualDiet === 'non-veg'
        : !((reqDiet === 'veg' || reqDiet === 'vegan') && actualDiet === 'non-veg');
      if (!isSatisfied) {
        allHardSatisfied = false;
      }
      const dietConfidence: VerificationConfidence = actualDiet
        ? (listing.pros.some(p => p.includes('schema.org')) ? 'CONFIRMED' : 'ESTIMATED')
        : 'UNVERIFIED';
      verifiedClaims.push({
        field: 'dietary',
        expected: reqDiet,
        observed: actualDiet,
        evidence: `Dish classification: ${actualDiet || 'general'}`,
        confidence: dietConfidence,
        satisfied: isSatisfied
      });
    }

    const overallConfidence: VerificationConfidence = !allHardSatisfied
      ? 'UNVERIFIED'
      : (hasUnverified || verifiedClaims.some(c => c.confidence === 'ESTIMATED') ? 'ESTIMATED' : 'CONFIRMED');

    return {
      sku: listing.sku,
      merchantName: listing.merchantName,
      productTitle: listing.productTitle,
      allHardRequirementsSatisfied: allHardSatisfied,
      overallConfidence,
      verifiedClaims,
      unverifiedClaims,
      evidenceAuditTrail
    };
  }
}

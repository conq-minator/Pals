import { UserApprovalTokenSchema, PurchaseProposal } from '../../shared/types/index.js';
import { DeterministicPolicyEngine } from '../../shared/policy/index.js';

async function verifyContractCompliance() {
  const proposal: PurchaseProposal = {
    proposalId: 'prop_test_01',
    taskId: 'tsk_test_01',
    merchantName: 'TechDirect Electronics',
    merchantDomain: 'techdirect.store',
    checkoutUrl: 'https://techdirect.store/checkout',
    productTitle: 'Apple MacBook Air 13.6"',
    sku: 'APL-MBA13',
    variant: { color: 'Midnight Blue' },
    pricingBreakdown: {
      basePrice: 1199.00,
      discountApplied: 50.00,
      shippingFee: 0,
      taxes: 91.92,
      totalPayable: 1240.92,
      currency: 'USD'
    },
    merchantTrustScore: 94,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  };

  const userId = 'usr_pals_shopper_01';
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const approvalToken = `apprv_${Date.now().toString(36)}_verify`;

  // Compute signature
  const signaturePayload = [
    approvalToken,
    proposal.proposalId,
    userId,
    proposal.pricingBreakdown.totalPayable.toFixed(2),
    proposal.pricingBreakdown.currency,
    proposal.merchantDomain,
    issuedAt,
    expiresAt
  ].join(':');

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(signaturePayload));
  const userSignature = 'sig_' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const token = {
    approvalToken,
    proposalId: proposal.proposalId,
    userId,
    authorizedMaxAmount: proposal.pricingBreakdown.totalPayable,
    authorizedCurrency: proposal.pricingBreakdown.currency,
    authorizedMerchantDomain: proposal.merchantDomain,
    userSignature,
    issuedAt,
    expiresAt
  };

  // 1. Validate against canonical Zod schema
  console.log('Testing UserApprovalTokenSchema.safeParse...');
  const parsed = UserApprovalTokenSchema.safeParse(token);
  if (!parsed.success) {
    throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
  }
  console.log('✓ UserApprovalToken strictly satisfies canonical UserApprovalTokenSchema!');

  // 2. Validate against DeterministicPolicyEngine
  console.log('Testing DeterministicPolicyEngine.validateApprovalTokenForPayment...');
  const policyCheck = DeterministicPolicyEngine.validateApprovalTokenForPayment(
    token,
    proposal.pricingBreakdown.totalPayable,
    proposal.pricingBreakdown.currency,
    proposal.merchantDomain
  );

  if (!policyCheck.valid) {
    throw new Error(`Policy validation failed: ${policyCheck.reason}`);
  }
  console.log('✓ Deterministic policy check passed (Code: ' + policyCheck.code + ')');

  // 3. Test price increase detection (Hard Invariant: final payable <= authorizedMaxAmount)
  const priceTamperCheck = DeterministicPolicyEngine.validateApprovalTokenForPayment(
    token,
    proposal.pricingBreakdown.totalPayable + 0.01,
    proposal.pricingBreakdown.currency,
    proposal.merchantDomain
  );
  if (priceTamperCheck.valid) {
    throw new Error('Price tamper check failed to reject +0.01 price increase!');
  }
  console.log('✓ Price tampering (+0.01) correctly rejected by DeterministicPolicyEngine: ' + priceTamperCheck.reason);
  console.log('All contract compliance verifications passed successfully!');
}

verifyContractCompliance();


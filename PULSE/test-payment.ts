import 'dotenv/config';
import { PulsePaymentRequest } from '../shared/types/index.js';

const port = process.env.PALS_API_PORT ?? 8000;
const base = `http://localhost:${port}`;

const now = new Date();
const issuedAt = now.toISOString();
const expiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 22)}`;
}

const paymentRequestId = makeId('payreq');
const proposalId = makeId('prop');

const request: PulsePaymentRequest = {
  paymentRequestId,
  proposalId,
  merchantDomain: 'demo-merchant.example',
  orderTotal: 25.00,
  currency: 'USD',
  paymentMethod: 'PAYPAL_ORDER',
  approvalToken: {
    approvalToken: makeId('apprv'),
    proposalId,
    userId: 'user-123',
    authorizedMaxAmount: 25.00,
    authorizedCurrency: 'USD',
    authorizedMerchantDomain: 'demo-merchant.example',
    userSignature: 'signature-' + Math.random().toString(36).substring(2),
    issuedAt,
    expiresAt,
  },
};

async function main() {
  console.log('=== POSITIVE TEST: Valid $25.00 request ===');
  console.log(`paymentRequestId: ${paymentRequestId}`);
  console.log(`proposalId: ${proposalId}`);

  const res = await fetch(`${base}/pulse/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data = await res.json();
  console.log(`Status: ${data.status}`);
  if (data.approveUrl) {
    console.log(`Approve URL: ${data.approveUrl}`);
    console.log('Open this URL and pay with the sandbox PERSONAL account');
  }
  if (data.errorMessage) {
    console.error(`Error: ${data.errorMessage}`);
  }

  console.log('\n=== NEGATIVE TEST: Amount $30.00 exceeds authorized $25.00 ===');
  const negativeRequest: PulsePaymentRequest = {
    ...request,
    orderTotal: 30.00,
  };

  const negRes = await fetch(`${base}/pulse/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(negativeRequest),
  });

  const negData = await negRes.json();
  console.log(`Status: ${negData.status}`);
  if (negData.status !== 'CREATED') {
    console.log('Policy block works');
  } else {
    console.error('ERROR: Policy block did not reject the over-authorized amount');
  }
  if (negData.errorMessage) {
    console.log(`Error reason: ${negData.errorMessage}`);
  }
}

main().catch(console.error);
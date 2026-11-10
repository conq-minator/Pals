# PULSE Module Memory & Change Log

> **Module:** PULSE (PaymentPal)  
> **Status:** Phase 0 (Specification Baseline Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Active Focus

- **Current Status:** Architectural contracts, order state machine, token invariants, and idempotency requirements documented. Payment actions updated: `payment.create_order`, `payment.capture`, `payment.refund`.
- **Two-step flow:** (1) `create_order` → PayPal order with `approveUrl`; buyer authenticates on PayPal. (2) `capture_order` → re-verified capture after buyer approval, returns `COMPLETED`.
- **Active Focus:** Awaiting Phase 1 authorization to set up the PayPal Sandbox environment and OAuth token lifecycle manager.

---

## 2. Key Architectural Decisions (PULSE Scope)

### ADR-PULSE-001: Strict Separation of Creation vs. Capture
- **Status:** **APPROVED**
- **Decision:** Order creation and payment capture must be separate functions executed in distinct lifecycle phases, with deterministic amount verification strictly executed before capture.
- **Rationale:** Prevents merchants or checkout scripts from altering cart totals between approval and settlement.

### ADR-PULSE-002: Deterministic Floating-Point Prevention
- **Status:** **APPROVED**
- **Decision:** All financial calculations within PULSE must use integer minor units (cents/paise) or an arbitrary-precision decimal library (`decimal.js`).
- **Rationale:** Eliminates floating-point rounding errors in currency comparisons.

### ADR-PULSE-003: Dispute Copilot Subsystem Architecture
- **Status:** **APPROVED**
- **Context:** Small merchants disproportionately lose chargebacks and dispute claims due to lack of time, missing evidence, or improper phrasing. PayPal's Customer Disputes API (`/v1/customer/disputes`) enables programmatic ingestion and defense.
- **Decision:** Embed Dispute Copilot directly inside PULSE (the sole PayPal integration layer). PULSE polls/ingests open claims, pulls tracking proofs and order histories, computes win-likelihood scores, detects serial disputer patterns, drafts Seller Protection-compliant responses, and enables one-click evidence submission or claim acceptance.
- **Consequences:** Deeply leverages PayPal's proprietary Disputes API. Requires sandbox dispute fixtures and custom test harnesses (`PULSE/disputes/sandbox_seeder.ts`) to simulate realistic dispute states without waiting for real-world cardholder disputes.

---

## 3. Backlog for Phase 1 Implementation

- [ ] Implement PayPal OAuth2 token cache with automated renewal (`PULSE/auth/`).
- [ ] Implement Orders v2 API client supporting sandbox mode (`PULSE/client/`).
- [ ] Implement webhook receiver with PayPal cryptographic signature verification (`PULSE/webhooks/`).
- [ ] Implement PayPal Customer Disputes API client (`GET /v1/customer/disputes`, `POST /provide-evidence`, `POST /accept-claim`).
- [ ] Implement Sandbox Dispute Seeder & Mock Fixtures for hermetic testing.
- [ ] Build Repeat Buyer Disputer pattern analyzer in `PULSE/disputes/patterns.ts`.
- [ ] Create mock PayPal API server for offline test suites (`tests/mocks/paypal.ts`).


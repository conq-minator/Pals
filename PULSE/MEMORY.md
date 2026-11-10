# PULSE Module Memory & Change Log

> **Module:** PULSE (PaymentPal)  
> **Status:** Phase 0 (Specification Baseline Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Active Focus

- **Current Status:** Architectural contracts, order state machine, token invariants, and idempotency requirements documented.
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

---

## 3. Backlog for Phase 1 Implementation

- [ ] Implement PayPal OAuth2 token cache with automated renewal (`PULSE/auth/`).
- [ ] Implement Orders v2 API client supporting sandbox mode (`PULSE/client/`).
- [ ] Implement webhook receiver with PayPal cryptographic signature verification (`PULSE/webhooks/`).
- [ ] Create mock PayPal API server for offline test suites (`tests/mocks/paypal.ts`).


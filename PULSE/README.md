# PULSE — PaymentPal

> **Identity:** Central Payment Processing & Transaction Management Engine  
> **Module Path:** `PULSE/`  
> **Owner Agent:** PULSE Specialist Agents (Antigravity / Claude / Codex)

---

## 1. Overview & Purpose

**PULSE** (PaymentPal) is the sole financial execution and transaction management engine of the PALS ecosystem.

All financial interactions with the PayPal ecosystem—including authentication, order creation, payment authorization, fund capture, refund issuance, webhook reconciliation, and invoice tracking—are strictly centralized inside PULSE. No other PAL or service is permitted to hold PayPal credentials or make financial API calls.

PULSE operates downstream of the Orchestrator, Deterministic Policy Validation, and the future DEFENDER security layer. PULSE guarantees that no money leaves a user's account without a cryptographically verified `UserApprovalToken` and deterministic policy clearance.

---

## 2. Key Responsibilities

1. **Centralized PayPal OAuth Management:** Secure token rotation, scope enforcement, and environment switching (Sandbox vs. Live).
2. **PayPal REST v2 & Agent Toolkit Integration:** Interfacing with PayPal Orders (`/v2/checkout/orders`), Payments, Captures, and Customer Disputes APIs.
3. **Dispute Copilot (Merchant Chargeback Defense):** Proactively pulls open claims via PayPal's Customer Disputes API (`/v1/customer/disputes`), analyzes claim types, aggregates evidence (order data, shipment tracking, communication logs), drafts persuasive evidence responses, computes win-likelihood scores, surfaces repeated buyer dispute patterns (e.g. serial disputers), and provides one-click evidence submission or claim acceptance.
4. **Deterministic Spending Verification:** Hard validation that final order amounts do not exceed the cryptographic ceiling authorized by the user.
5. **Order Lifecycle Separation:** Strict separation between Order Creation, User Authorization, Payment Capture, and Verification.
6. **Webhook Ingestion & Idempotency:** Secure webhook processing with signature verification to prevent duplicate charges or replay attacks.
7. **Immutable Transaction Ledger & Receipts:** Writing tamper-evident audit records and digital receipts for every monetary event.

---

## 3. Strict Boundary Rules & Prohibitions

- **NO Product Research or Shopping:** PULSE never browses catalogs, compares prices, or interacts with merchants; that is exclusively **ARB's** domain.
- **NO Direct User Chat:** PULSE does not converse with users; all status reporting and receipts are returned through the Orchestrator to **GLY**.
- **NO Unapproved Transactions:** PULSE will instantly abort any transaction lacking a valid, unexpired `UserApprovalToken`.
- **NO Amount Escalation:** If the merchant capture amount exceeds the approved token ceiling by even $0.01 / ₹0.01, PULSE immediately aborts the payment.

---

## 4. Module File Manifest

- [README.md](README.md) — System overview, purpose, and interfaces.
- [CONTEXT.md](CONTEXT.md) — PayPal API topology, order state machine, and webhook verification.
- [MEMORY.md](MEMORY.md) — Module changelog, ADRs, and active development state.
- [RESPONSIBILITIES.md](RESPONSIBILITIES.md) — Strict boundary definitions, safety checks, and token invariants.


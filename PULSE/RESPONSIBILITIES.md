# PULSE Boundary & Responsibility Contract

> **Module:** PULSE (PaymentPal)  
> **Rule:** Every developer and AI agent working in `PULSE/` must strictly observe these boundaries.

---

## 1. What PULSE DOES

1. **Exclusively Manage PayPal Credentials:** Stores, rotates, and applies PayPal API Client ID and Secret in sandbox and live modes.
2. **Execute PayPal Orders API:** Initiates `POST /v2/checkout/orders` for approved items.
3. **Capture Payments:** Captures authorized payments after deterministic amount validation.
4. **Enforce Deterministic Spending Limits:** Asserts that transaction amounts never exceed the user's signed `UserApprovalToken`.
5. **Ingest Webhooks:** Verifies cryptographic signatures on PayPal webhooks and updates transaction state.
6. **Process Refunds:** Dispatches authorized refund requests to PayPal for disputed transactions.
7. **Write Audit Ledger:** Maintains an immutable record of transaction IDs, capture IDs, timestamps, and fees.
8. **Issue Digital Receipts:** Emits standardized receipt objects back to the Orchestrator.

---

## 2. What PULSE DOES NOT DO

1. **DO NOT Perform Product Research:** PULSE never browses e-commerce websites, compares specs, or searches for deals.
2. **DO NOT Negotiate Deals:** PULSE does not handle promotional discounts or coupon validation.
3. **DO NOT Converse with the User:** PULSE has no conversational UI; all outputs are structured data returned to the Orchestrator and delivered by **GLY**.
4. **DO NOT Execute Unapproved Charges:** PULSE must fail with a fatal exception if invoked without an unexpired, cryptographically signed `UserApprovalToken`.
5. **DO NOT Bypass Upstream Filters:** PULSE accepts requests only through `calls/` (after Policy and DEFENDER clearance), never directly from ARB or GLY via unmediated channels.

---

## 3. Allowed Dependencies & Tools

- `calls/` (Single Central Communication Gateway for all inter-PAL calls)
- `shared/types/` (Typed interface definitions from [API_CONTRACTS.md](../API_CONTRACTS.md))
- `shared/policy/` (Deterministic financial bounds checking)
- `shared/logging/` (Audit logger with automatic credential masking)
- `shared/db/` (Relational database connection pool for transaction ledger)
- Official PayPal Node.js / REST SDKs / Agent Toolkit

---

## 4. Cross-Module Delegation Triggers (via `calls/`)

All inbound payment requests and outbound status notifications must route through `calls/`.

| Trigger Event | Target via `calls/` | Envelope & Action |
| :--- | :--- | :--- |
| Payment captured successfully | **GLY** via `calls/` | `PalCallResponse(action='payment.completed', data=Receipt)` |
| Amount exceeds approval token limit | **GLY** via `calls/` | `PalCallResponse(status='ERROR', error=PolicyException('AMOUNT_MISMATCH'))` |
| Transaction status queried | **GLY** via `calls/` | `PalCallResponse(action='transaction.status', data=StatusPayload)` |


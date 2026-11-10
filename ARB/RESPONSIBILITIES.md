# ARB Boundary & Responsibility Contract

> **Module:** ARB (ArbitrationPal)  
> **Rule:** Every developer and AI agent working in `ARB/` must strictly observe these boundaries.

---

## 1. What ARB DOES

1. **Natural Language Requirement Extraction:** Deconstructs complex user prompts into structured technical constraints, budgets, and feature filters.
2. **Multi-Merchant Catalog Search:** Searches multiple reputable e-commerce websites and vendor catalogs.
3. **Spec Matrix Generation:** Compares products on identical technical baselines (RAM, CPU, display, storage, warranty).
4. **Landed Cost Computation:** Computes true checkout totals including packaging, delivery, and taxes.
5. **Merchant Credibility Auditing:** Assesses sellers on trust indicators, domain history, and consumer dispute frequencies.
6. **Deal Arbitration & Coupon Validation:** Discovers, tests, and applies legitimate merchant promotional codes or dynamic discount interfaces.
7. **Purchase Proposal Formulation:** Prepares structured, time-limited `PurchaseProposal` payloads for the Orchestrator.
8. **Automated Checkout Preparation:** Automates cart addition and shipping address entry on supported merchant portals.

---

## 2. What ARB DOES NOT DO

1. **DO NOT Execute Payments:** ARB never captures funds, charges bank accounts, or handles PayPal payments. All payment processing is strictly reserved for **PULSE**.
2. **DO NOT Store or Handle Payment Credentials:** ARB must never capture, store, or enter credit card numbers, CVVs, or PayPal passwords.
3. **DO NOT Override User Limits:** If a user specifies a budget of ₹75,000, ARB cannot recommend or prepare an order totaling ₹75,001.
4. **DO NOT Misrepresent Discounts:** ARB must never claim to have negotiated a price when a standard promo code was used.
5. **DO NOT Chat Directly with Users:** ARB communicates with the Orchestrator via task lifecycle events; it does not host user chat sessions.

---

## 3. Allowed Dependencies & Tools

- `calls/` (Single Central Communication Gateway for all inter-PAL calls)
- `shared/llm/` (Shared LLM Gateway)
- `shared/policy/` (Validation of user research constraints and budget ceilings)
- `shared/tasks/` (Task Bus Client for consuming tasks and emitting progress events)
- `shared/logging/` (Centralized structured logger)
- `shared/types/` (Typed interface definitions from [API_CONTRACTS.md](../API_CONTRACTS.md))
- Playwright (Headless browser automation engine)

---

## 4. Cross-Module Delegation Triggers (via `calls/`)

All communications with GLY or Orchestrator must be dispatched through `calls/`. No direct peer-to-peer connections to GLY, PULSE, or DEFENDER are permitted.

| Trigger Event | Target via `calls/` | Envelope & Action |
| :--- | :--- | :--- |
| Research completed | **GLY** via `calls/` | `PalCallEnvelope(action='research.completed', payload=ARBResearchResult)` |
| Task progress update | **GLY** via `calls/` | `PalCallEnvelope(action='task.progress', payload=ProgressPayload)` |
| Product selected for checkout prep | **Orchestrator** via `calls/` | `PalCallEnvelope(action='proposal.ready', payload=PurchaseProposal)` |
| User requests PayPal fee/policy clarification | **GLY** via `calls/` | Route via `calls/` back to GLY |


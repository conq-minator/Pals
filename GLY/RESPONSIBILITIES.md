# GLY Boundary & Responsibility Contract

> **Module:** GLY (GuidePal)  
> **Rule:** Every developer and AI agent working in `GLY/` must strictly observe these boundaries.

---

## 1. What GLY DOES

1. **Ingest All User Dialogue:** Acts as the sole conversational entry point and listener for the user.
2. **Intent Classification:** Classifies user statements into guidance queries, shopping research requests, or payment operations.
3. **PayPal RAG Guidance:** Retrieves and synthesizes answers exclusively from the official PayPal knowledge base.
4. **Task Delegation:** Creates structured `TaskDelegationRequest` objects and hands them off to the Orchestrator.
5. **Immediate Acknowledgment:** Informs the user when work is delegated and stays active for parallel conversation.
6. **Result Streaming:** Ingests completed task events from the Orchestrator and presents them cleanly to the user.
7. **Approval Interface Presentation:** Renders the interactive authorization card when a purchase proposal is ready for user sign-off.

---

## 2. What GLY DOES NOT DO

1. **DO NOT Scrape Product Listings:** GLY never invokes Playwright, scrapes websites, or compares product specifications. That is exclusively **ARB's** domain.
2. **DO NOT Negotiate Deals:** GLY does not negotiate with merchant bots or discount APIs.
3. **DO NOT Execute Payments:** GLY has zero access to PayPal API secrets, cannot initiate captures, and cannot process refunds. That is exclusively **PULSE's** domain.
4. **DO NOT Block Conversations:** GLY must never wait synchronously for a background task to complete before returning a response to the user.
5. **DO NOT Hallucinate Policies:** If the PayPal RAG search returns no confident match, GLY must acknowledge the limitation rather than invent procedural rules.

---

## 3. Allowed Dependencies & Tools

- `calls/` (Single Central Communication Gateway for all inter-PAL calls)
- `shared/llm/` (Shared LLM Gateway)
- `shared/db/vector/` (Vector Store Adapter for PayPal RAG)
- `shared/tasks/` (Task Bus Client for delegating tasks and listening to events)
- `shared/logging/` (Centralized structured logger)
- `shared/types/` (Typed interface definitions from [API_CONTRACTS.md](../API_CONTRACTS.md))

---

## 4. Cross-Module Delegation Triggers (via `calls/`)

All communications with other PALs must be dispatched through `calls/`. No direct PAL-to-PAL connections are permitted.

| User Intent / Trigger | Target PAL via `calls/` | Action / Envelope |
| :--- | :--- | :--- |
| Shopping query, product search, price comparison | **ARB** via `calls/` | `PalCallEnvelope(action='research.start', payload=ARBResearchPayload)` |
| Deal arbitration, coupon search, checkout preparation | **ARB** via `calls/` | `PalCallEnvelope(action='purchase_prep.start', payload=PurchaseProposal)` |
| Payment capture, order creation, refund execution | **PULSE** via `calls/` | `PalCallEnvelope(action='payment.execute', payload=PulsePaymentRequest)` |
| Historical transaction lookup, balance inquiry | **PULSE** via `calls/` | `PalCallEnvelope(action='transaction.query', payload=TransactionQueryRequest)` |


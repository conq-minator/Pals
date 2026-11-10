# Calls System Boundary & Responsibility Contract

> **Module:** `calls/` (Central Inter-Agent Gateway)  
> **Rule:** Mandatory reading for all developers and AI agents designing or invoking inter-PAL operations.

---

## 1. What the Calls System DOES

1. **Centralized Message Routing:** Receives, validates, and routes every communication envelope between GLY, ARB, PULSE, and DEFENDER.
2. **Contract Validation:** Enforces payload schema conformance matching [API_CONTRACTS.md](../API_CONTRACTS.md).
3. **Correlation & Lifecycle Tracking:** Maintains end-to-end trace correlation IDs linking initial user messages to background subtasks and final payment executions.
4. **Timeout & Failure Handling:** Deterministically times out hung worker requests and returns standard error responses to callers.
5. **Reusable Client SDK:** Provides a uniform, lightweight client interface for each PAL to make calls without knowing recipient internals.

---

## 2. What the Calls System DOES NOT DO

1. **DO NOT Execute Domain Logic:** `calls/` does not scrape websites, run RAG pipelines, or call PayPal APIs. It is strictly a communication gateway and dispatcher.
2. **DO NOT Mutate Business Payloads:** `calls/` routes data transparently without altering parameters, prices, or user instructions.
3. **DO NOT Allow Direct PAL Bypasses:** `calls/` rejects any communication where agents attempt to establish direct point-to-point sockets or call unadvertised methods.
4. **DO NOT Execute in Phase 0:** In Phase 0, this module exists as an architectural specification and interface envelope definition only.

---

## 3. Delegation & Routing Matrix

| Caller | Target Callee | Typical Action | Pattern |
| :--- | :--- | :--- | :--- |
| **GLY** | **ARB** | `research.start`, `arbitration.negotiate` | Asynchronous Handoff |
| **ARB** | **GLY** | `task.progress`, `research.completed`, `clarification.request` | Event Push |
| **GLY / Orch** | **DEFENDER** | `security.assess_transaction` | Synchronous Request-Response |
| **GLY / Orch** | **PULSE** | `payment.create_order`, `payment.capture` | Synchronous / Protected |
| **GLY** | **PULSE** | `transaction.query_status`, `account.balance` | Synchronous Request-Response |
| **PULSE** | **GLY** | `payment.settled`, `payment.receipt_ready` | Event Push |


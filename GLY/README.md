# GLY — GuidePal

> **Identity:** Central Conversational Gateway & PayPal Knowledge Specialist  
> **Module Path:** `GLY/`  
> **Owner Agent:** GLY Specialist Agents (Antigravity / Claude / Codex)

---

## 1. Overview & Purpose

**GLY** is the front-of-house conversational gateway for the entire PALS ecosystem and the authoritative domain specialist on all matters relating to PayPal.

To the user, GLY is their personal companion. All incoming messages flow through GLY. When a user asks general shopping or payment questions, GLY either resolves them immediately using its grounded PayPal Knowledge Base (RAG) or seamlessly delegates the work to specialized background companions (**ARB** for product research/negotiation or **PULSE** for payment processing) via the Orchestrator.

GLY operates strictly as a **non-blocking conversational gateway**: it acknowledges delegated tasks instantly, maintains active conversation on any topic while background workers perform their tasks, and renders completed results back into the conversation.

---

## 2. Key Responsibilities

1. **Conversational Ingestion & Routing:** Ingest all chat messages, classify user intent, and determine whether immediate RAG guidance, background delegation to ARB, or transaction routing to PULSE is required.
2. **Authoritative PayPal Knowledge (RAG):** Ingest and retrieve official PayPal consumer and developer documentation to explain fees, buyer protection, dispute lifecycles, KYC, and API capabilities.
3. **Task Delegation & Tracking:** Formulate structured task delegation requests for the Orchestrator and track their status in real time.
4. **Conversational Result Delivery:** Ingest asynchronous task completion events from the event bus and present them conversationally to the user with actionable UI cards.
5. **Continuous Non-Blocking Dialogue:** Maintain conversational availability even when other PALs are executing long-running background tasks.

---

## 3. Strict Boundary Rules & Prohibitions

- **NO E-Commerce Web Scraping:** GLY does not scrape merchant websites or search product catalogs; this is exclusively ARB's domain.
- **NO Price Negotiation:** GLY does not communicate with merchant chat bots or negotiate prices.
- **NO Direct Payment Execution:** GLY never captures payments, stores PayPal credentials, or invokes PayPal checkout APIs directly; all payment requests are dispatched through the Orchestrator to PULSE.
- **NO Synchronous Blocking:** GLY must never hang a user's conversational thread waiting for a background worker.

---

## 4. Module File Manifest

- [README.md](README.md) — System overview, purpose, and interfaces.
- [CONTEXT.md](CONTEXT.md) — Deep technical context, intent classification, and RAG architecture.
- [MEMORY.md](MEMORY.md) — Module changelog, ADRs, and active development state.
- [RESPONSIBILITIES.md](RESPONSIBILITIES.md) — Strict boundary definitions, tool whitelists, and delegation protocols.

## 5. Standalone implementation

The runnable GLY demo and its developer quick start are in [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

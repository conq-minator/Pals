# PALS Master Memory & Decision Record

> **Status:** Phase 0 Active (Architecture & Specification Baseline)  
> **Last Updated:** 2026-11-10  
> **Maintainers:** Google Antigravity, Claude Code, OpenAI Codex  
> **Rule:** Every AI coding agent must review this file before starting work and update it upon completing meaningful architectural changes or milestones.

---

## 1. Project Health & Milestone Status

| Milestone / Phase | Status | Completion Target | Lead / Agent | Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0: Architecture & Documentation** | **COMPLETED** | 2026-11-10 | Antigravity | Full documentation framework, contracts, directory topologies, and safety boundaries established. |
| **Phase 1: Core Foundation** | **PENDING APPROVAL** | TBD | Multi-Agent | Shared infrastructure, Orchestrator state machine, GLY RAG baseline, ARB MVP scraper, PULSE sandbox integration. |
| **Phase 2: Advanced ARB & Negotiation** | **PLANNED** | TBD | Multi-Agent | Multi-merchant spec matrix, deal arbitration, checkout automation. |
| **Phase 3: Device Interaction** | **PLANNED** | TBD | Multi-Agent | Desktop browser automation and mobile companion integration. |
| **Phase 4: Defender Security Layer** | **PLANNED** | TBD | Multi-Agent | Adversarial prompt defense, merchant fraud scoring, automated step-up auth. |

---

## 2. Key Architectural Decisions (ADR Registry)

### ADR-001: GLY as the Sole Conversational Gateway
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** The system needs to present a coherent, single-companion persona while managing complex, specialized agent workflows.
- **Decision:** Users communicate exclusively with GLY. GLY handles all conversational dialogue, answers PayPal RAG questions, and coordinates background workers (ARB, PULSE) via the Orchestration layer.
- **Consequences:** Eliminates chatbot fragmentation for the user. Requires GLY to remain completely non-blocking during delegated tasks.

### ADR-002: Asynchronous Event-Driven Task Management
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** Web scraping, product comparison, and merchant negotiation take significant wall-clock time (seconds to minutes). Synchronous HTTP requests would freeze the conversation.
- **Decision:** All delegated tasks are queued with unique Task IDs and processed asynchronously. Task state changes emit events that are pushed via WebSockets to GLY and rendered seamlessly in the conversation.
- **Consequences:** GLY can answer other questions (e.g., PayPal fees) while ARB researches laptops in the background.

### ADR-003: Deterministic Spending Policy & Hard Financial Invariants
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** LLMs are susceptible to prompt injection, hallucinated currency conversions, and accidental price boundary violations.
- **Decision:** Financial constraints (budgets, daily limits, merchant allowlists) must be validated in deterministic application code inside the Orchestrator and PULSE. An order exceeding the user's authorized limit by even \$0.01 is automatically aborted by code, regardless of what the LLM recommended.
- **Consequences:** Guarantees zero unapproved monetary leakage.

### ADR-004: Positioning of Defender Immediately Upstream of PULSE
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** Defender is scheduled for Phase 4, but the system must be designed from day one to support it without painful refactoring.
- **Decision:** The transaction lifecycle is architected as:
  $$\text{ARB} \longrightarrow \text{ORCHESTRATOR} \longrightarrow \text{USER APPROVAL} \longrightarrow \mathbf{DEFENDER} \longrightarrow \text{PULSE} \longrightarrow \text{PAYPAL}$$
  In Phase 1–3, DEFENDER is bypassed via a pass-through interface returning `APPROVED`.
- **Consequences:** Zero rework required when DEFENDER is activated in Phase 4.

### ADR-005: "One Capability = One Central Implementation" (Non-Duplication Policy)
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** With multiple coding agents working in parallel, duplicated utilities (multiple HTTP clients, redundant vector store connectors, conflicting PayPal SDKs) cause rapid tech debt.
- **Decision:** All shared utilities reside strictly in `shared/`. No PAL is permitted to implement its own payment gateway, vector client, or LLM wrapper.
- **Consequences:** Consistent logging, uniform telemetry, and maintainable cross-cutting upgrades.

### ADR-006: Central Calls System (`calls/`) as the Single Inter-PAL Gateway
- **Date:** 2026-11-10
- **Status:** **APPROVED**
- **Context:** Direct peer-to-peer communication between agents creates tight coupling, circular dependencies, and difficult debugging.
- **Decision:** Establish a dedicated root-level folder `calls/` as the single communication gateway for all PALS. Every inter-agent request, response, and task handoff (GLY <-> ARB, GLY <-> PULSE, DEFENDER <-> PULSE) must pass through `calls/`. No PAL may establish an independent communication channel.
- **Consequences:** Completely decouples agents; each PAL only needs to know how to call the shared gateway. Centralizes tracing, correlation IDs, timeouts, and error handling. Reserved for implementation; active in Phase 0 as an architectural contract.

### ADR-007: Adoption of OpenMausBot Egress Containment & OpenDot "Second Look" Verification
- **Date:** 2026-11-10
- **Status:** **APPROVED FOR PHASE 1–4 ROADMAP**
- **Context:** Evaluated external architectures from `milind-soni/OpenMausBot` and `thinkwee/OpenDot` for agent sandboxing, action verification, and network isolation.
- **Decision:** 
  1. Adapt OpenMausBot's SOCKS5 proxy egress filtering and DNS-rebinding guard into `ARB/` and `defender/` to isolate headless scraping.
  2. Adapt OpenMausBot's event normalization stream pattern into `calls/`.
  3. Adapt OpenDot's "Second Look" action verification paradigm and "Permanently Locked Financial Actions" into `shared/policy/`, `defender/`, and `PULSE/`.
- **Consequences:** Details documented in `docs/research/OPENMAUSBOT_AND_OPENDOT_ANALYSIS.md`. Implementation scheduled across respective phases. No immediate code added in Phase 0.

---

## 3. Rejected Alternatives & Architectural Graveyard

| Rejected Concept | Why It Was Rejected | Chosen Alternative |
| :--- | :--- | :--- |
| **Peer-to-Peer Agent Chat** | Unpredictable message loops, difficult debugging, poor latency, confusing to users who have to jump between 4 bot personas. | Centralized Orchestrator with GLY as the unified front-of-house gateway. |
| **Prompt-Based Spending Limits** | Prompt injection attacks or hallucinations can easily persuade an LLM to exceed user budgets. | Hard deterministic code validations in the shared policy engine and PULSE. |
| **ARB Direct Payment Integration** | Violates separation of duties; grants scraping agent financial privileges, increasing the attack surface. | PULSE holds exclusive access to PayPal credentials; ARB only creates unsigned purchase proposals. |
| **Synchronous Scraping in Chat Thread** | Scraping e-commerce sites takes 10–60 seconds, which freezes chat UI and creates terrible UX. | Asynchronous task queue with persistent task IDs and background event streaming. |

---

## 4. Current Work in Progress

- **Active Phase:** Phase 0 (Finalizing specifications, directory structures, and documentation trees).
- **Current Blocker:** Awaiting human developer review and Phase 1 kickoff authorization. **No application code or dependencies may be installed until authorized.**

---

## 5. Backlog & Open Architectural Questions for Phase 1

1. **Task Queue Selection:** Evaluate Redis Streams + BullMQ vs. PostgreSQL LISTEN/NOTIFY for internal task orchestration.
2. **Browser Engine Selection:** Evaluate Playwright vs. Puppeteer for ARB merchant scraping and checkout navigation (Playwright preferred for cross-platform resilience).
3. **Vector Store Selection:** Evaluate `pgvector` vs. Qdrant for GLY's PayPal knowledge RAG pipeline.
4. **Agent State Storage:** Design JSON schema for persisting conversation histories across multi-agent handoffs.


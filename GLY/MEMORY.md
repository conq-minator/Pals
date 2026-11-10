# GLY Module Memory & Change Log

> **Module:** GLY (GuidePal)  
> **Status:** Phase 0 (Specification Baseline Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Active Focus

- **Current Status:** Architectural definition completed. Boundary invariants and intent taxonomy established.
- **Active Focus:** Awaiting Phase 1 kickoff to implement the intent routing engine and `pgvector` RAG pipeline.

---

## 2. Key Architectural Decisions (GLY Scope)

### ADR-GLY-001: Intent Classification via Structured Outputs
- **Status:** **APPROVED**
- **Decision:** Inbound messages will be parsed using structured LLM function calling (Gemini 2.5 Flash / Claude 3.5 Haiku) into defined Zod schemas.
- **Rationale:** Ensures deterministic downstream routing and prevents hallucinated entity parameters.

### ADR-GLY-002: Immediate Task Acknowledgment
- **Status:** **APPROVED**
- **Decision:** Asynchronous tasks must be acknowledged immediately before the background worker finishes. The chat socket never waits for scraping.
- **Rationale:** Prevents UI freezes and allows natural conversational continuity.

---

## 3. Backlog for Phase 1 Implementation

- [ ] Ingest official PayPal developer and user documentation markdown corpus into `docs/knowledge/paypal/`.
- [ ] Build chunking script with metadata tagging (`shared/db/vector/`).
- [ ] Implement fast streaming response handler with WebSocket support.
- [ ] Implement unit tests for intent classification accuracy.


# PALS Multi-Agent Engineering Rules & Development Standards

> **MANDATORY READING FOR ALL CONTRIBUTORS & CODING AGENTS**  
> *Enforced across Google Antigravity, Claude Code, and OpenAI Codex*

---

## 1. Golden Multi-Agent Protocol

Before executing any design or coding task, every AI agent must execute this sequential checklist:

1. **Read Root Context:** Read [README.md](README.md), [CONTEXT.md](CONTEXT.md), and [PRD.md](PRD.md).
2. **Review Recent Memory:** Read [MEMORY.md](MEMORY.md) to inspect recent decisions, active blockers, and rejected designs.
3. **Inspect Assigned PAL Boundary:** Read `CONTEXT.md`, `RESPONSIBILITIES.md`, and `MEMORY.md` inside your target module.
4. **Audit Existing Utilities:** Inspect `shared/` before creating any helper, API client, or schema.
5. **Respect API Contracts:** Adhere to [API_CONTRACTS.md](API_CONTRACTS.md). Never alter contract schemas unilaterally.
6. **Update Documentation Post-Work:** Immediately record new ADRs, completed tasks, or known issues in the relevant `MEMORY.md`.

---

## 2. Module Ownership Matrix

To prevent agents from stepping on each other's work or creating conflicting implementations:

| Directory | Assigned Responsibility | Primary Technologies | Prohibited Additions |
| :--- | :--- | :--- | :--- |
| **`GLY/`** | Conversational gateway, intent routing, PayPal RAG | TypeScript / Python FastRAG | Web scraping, price negotiation, direct PayPal payment capture. |
| **`ARB/`** | Product research, price arbitrage, merchant audit, checkout prep | TypeScript / Playwright | Direct payment capture, PayPal OAuth token creation, user chat UI. |
| **`PULSE/`** | Central PayPal integration, orders, captures, webhooks, receipts | TypeScript / PayPal REST SDK | Product catalog scraping, market price comparison, direct user chat. |
| **`defender/`** | Transaction risk scoring, prompt injection defense (Phase 4) | Python / TypeScript | Phase 1–3 execution. Must remain an interface stub until Phase 4. |
| **`calls/`** | Central communication gateway, envelope routing, task handoffs | TypeScript / Message Broker | Business domain logic, direct scraping, payment handling. |
| **`frontend/`** | User conversational interface, settings, interactive approval cards | Next.js / TailwindCSS / React | Business logic, direct PayPal secret storage, direct browser scraping. |
| **`shared/`** | Central types, database models, LLM wrappers, deterministic policy | TypeScript / Prisma / Pydantic | Agent-specific logic or bespoke scraping routines. |
| **`docs/`** | System documentation, schemas, architectural diagrams | Markdown / Mermaid | Executable code. |
| **`tests/`** | End-to-end integration tests and contract verification suites | Jest / Vitest / Pytest | Ad-hoc one-off test scripts without assertion frameworks. |

---

## 3. The Non-Duplication Policy ("One Capability = One Central Implementation")

### Strict Invariant: No Redundant Implementations
- **One Central Communication Gateway (`calls/`):** All inter-agent communication, delegation, and status events must pass through `calls/`. No PAL may establish independent point-to-point connections with another PAL.
- **One Shared LLM Gateway:** All LLM invocations must go through `shared/llm/`. No PAL may instantiate raw SDK clients (`new OpenAI()`, `GoogleGenerativeAI()`) in its local folder.
- **One Shared Policy Engine:** Budget checks, merchant allowlists, and currency validation reside strictly in `shared/policy/`.
- **One Vector Store Integration:** GLY must use the central vector store adapter in `shared/db/vector/`.
- **One PayPal Integration:** All PayPal interactions exist solely inside `PULSE/`. No other directory may import PayPal SDKs or call PayPal endpoints.
- **One Task Queue Adapter:** Task queuing and background event broadcasting reside in `shared/tasks/`.

---

## 4. Coding & Architecture Standards

### 4.1 TypeScript / JavaScript Rules
- **Strict Mode:** TypeScript `strict: true` is non-negotiable. No use of `any`; use `unknown` with type narrowing or Zod schemas.
- **Validation:** Every inbound external payload (REST, WebSocket, Webhook) must be validated via **Zod** or **TypeBox** schemas matching [API_CONTRACTS.md](API_CONTRACTS.md).
- **Async/Await:** Prefer `async/await` over raw promise chains. All unhandled promises must be trapped by centralized error boundaries.

### 4.2 Python Rules (AI / RAG Services)
- **Typing:** Strict type hints (`typing`) on all function signatures.
- **Package Management:** Use poetry or uv with pinned dependency versions.
- **Linting & Formatting:** Follow PEP 8 via `ruff` and `black`.

### 4.3 Deterministic Safety Rules
- **No LLM Financial Authority:** An LLM may suggest a purchase, but it can never authorize funds. Financial policy validation must execute in pure, non-LLM application code.
- **Floating Point Math Ban:** Currency operations must be handled using integer cents/paise or specialized arbitrary-precision libraries (e.g., `decimal.js` or Python `decimal.Decimal`). Never perform financial arithmetic using raw IEEE 754 floating-point numbers (`0.1 + 0.2 != 0.3`).

---

## 5. Security & Privacy Invariants

1. **No Plaintext Secrets:** Never commit `.env` or write credentials to disk. All environment variables must be validated at application startup using a typed schema.
2. **PII Masking:** Logs must automatically mask user names, email addresses, credit card numbers, and PayPal tokens before writing to disk or console.
3. **Headless Browser Sandboxing:** All ARB scraping instances must execute in isolated worker threads or containers with restricted filesystem access.
4. **Approval Re-Validation:** Any price divergence between user approval and checkout triggers an automatic abort and re-approval challenge.

---

## 6. Git Workflow & Multi-Agent Collaboration

- **Atomic Branches:** Features are developed on dedicated branches: `feat/gly-rag`, `feat/arb-scraper`, `feat/pulse-orders`.
- **Commit Conventions:** Follow Conventional Commits:
  - `feat(gly): add semantic chunking for paypal dispute documents`
  - `fix(pulse): resolve currency precision in order payload`
  - `docs(contracts): add purchase proposal schema`
- **Documentation Synchronicity:** No PR or milestone may be marked complete in `MEMORY.md` without corresponding documentation updates.


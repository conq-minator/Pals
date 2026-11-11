# DEFENDER Module Memory & Backlog

**Module:** DEFENDER  
**Status:** Phase 4 Implementation (baseline established 2026-11-10)  
**Last Updated:** 2026-11-10

---

## 1. Current Status

- **Implementation status:** All 7 core files created (`rules.ts`, `domain_check.ts`, `injection_scanner.ts`, `llm_judge.ts`, `index.ts`, `server.ts`, `demo.ts`).
- **Phase 4 baseline:** Decision pipeline, 4-layer threat detection, LLM judge integration, Express server, and demo scenarios are complete.
- **Type check:** `npm run typecheck` passes with zero errors.
- **Demo:** `npm run defender:demo` runs all scenarios A–E and validates expectations.

---

## 2. Key Architectural Decisions (Phase 4)

### ADR-DEF-001: Four-Layer Pre-Pipeline Audit
- **Decision:** DEFENDER runs a 4-layer pipeline (deterministic rules → domain audit → heuristic prompt injection → LLM judge) before approving a transaction.
- **Rationale:** Defense in depth — deterministic checks catch obvious tampering quickly; the LLM catches subtle indirect injection that regex alone misses.

### ADR-DEF-002: LLM as Add-Only Enhancer
- **Decision:** The LLM judge can only ADD threats; it must never remove or downgrade a threat found by layers 1–3.
- **Rationale:** Guarantees that a failing LLM call or an uncooperative model cannot weaken security guarantees provided by deterministic checks.

### ADR-DEF-003: Risk-Score Based Decision Gate
- **Decision:** Decision mapped from maximum severity: CRITICAL→REJECTED, HIGH→MANUAL_REVIEW_REQUIRED, else APPROVED with graduated riskScore (0.05–0.95).
- **Rationale:** Provides a numeric risk score for downstream consumers (orchestrator, dashboard) rather than a binary decision only.

### ADR-DEF-004: In-Memory Velocity Tracking (no Redis)
- **Decision:** Velocity map stored in-process per userId; timestamps older than 60s auto-evict.
- **Rationale:** No new dependencies (no Redis client); sufficient for hackathon prototype; production would use Redis sorted sets.

### ADR-DEF-005: Gemini Flash as Default LLM
- **Decision:** Default model `gemini-3.5-flash` read from `GEMINI_MODEL` env var; `GEMINI_API_KEY` required for LLM layer.
- **Rationale:** Current stable Gemini Flash model at the time of implementation; configurable via environment.

---

## 3. Phase 4 Backlog (Completed)

- [x] deterministic rules (rules.ts) — price tampering, currency, domain, expiry, velocity, pricing consistency
- [x] domain/scam checking (domain_check.ts) — subdomain, SSL, IP, punycode, typosquatting, trust score
- [x] heuristic prompt injection (injection_scanner.ts) — phrase detection, control chars, base64, role tags, comments
- [x] LLM judge via Gemini REST API (llm_judge.ts) — real API call, defensive Zod parsing, add-only threat merging
- [x] orchestration & decision logic (index.ts) — schema validation, layer merging, decision gate, audit log
- [x] Express server (server.ts) — POST /assess, GET /audit, GET /health, CORS
- [x] Demo scenarios (demo.ts) — A through E with expectation validation
- [x] README.md and MEMORY.md documentation

---

## 4. Acceptance Checks (must all pass)

1. `npm run typecheck` → zero errors
2. `npm run defender:demo` → scenarios A–D match expectations, with and without GEMINI_API_KEY set
3. With the key set, scenario E is flagged by the LLM judge
4. `git status` does not list `.env`

---

## 5. Files Created (Phase 4)

| File | Lines | Description |
|---|---|---|
| `defender/rules.ts` | ~80 | Deterministic checks (price, currency, domain, expiry, velocity, consistency) |
| `defender/domain_check.ts` | ~130 | SCAM_DOMAIN heuristics (subdomain, SSL, IP, punycode, typosquatting, trust score) |
| `defender/injection_scanner.ts` | ~170 | Heuristic PROMPT_INJECTION detection across merchant-controlled strings |
| `defender/llm_judge.ts` | ~180 | REAL Gemini API call; defensive Zod parsing; add-only threat merging |
| `defender/index.ts` | ~140 | Orchestrator: validate → run layers 1–3 → LLM → merge → decision + audit |
| `defender/server.ts` | ~80 | Express on DEFENDER_PORT; CORS for localhost:3333/8000; /assess /audit /health |
| `defender/demo.ts` | ~150 | 5 scenarios (A–E), table output, exit code 1 on failure |
| `defender/README.md` | — | How it works, 4 layers, how to run |
| `defender/MEMORY.md` | — | Changelog, ADRs, roadmap |
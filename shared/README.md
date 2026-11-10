# PALS Shared Infrastructure (`shared/`)

> **Ownership:** Platform Architecture Team & Shared Infrastructure Group  
> **Rule:** All cross-cutting concerns reside here. No PAL may independently reimplement any capability provided in this directory.

---

## 1. Directory Structure & Subsystems

```text
shared/
├── types/         # Central TypeScript interfaces & Zod runtime schemas (API_CONTRACTS.md)
├── policy/        # Deterministic spending limits, merchant allowlists & currency validators
├── llm/           # Centralized LLM client gateway (Gemini, Claude, OpenAI)
├── db/            # Database connection pool, Prisma/SQLAlchemy models & migrations
│   └── vector/    # pgvector client for GLY's PayPal knowledge base
├── tasks/         # Central asynchronous task manager & Redis/event bus client
├── logging/       # Centralized JSON logger with automatic credential & PII masking
└── utils/         # Common cryptographic, date, and currency formatting helpers
```

---

## 2. Shared Subsystem Invariants

1. **`shared/policy/` (Deterministic Financial Checks):**
   - Pure, deterministic code routines.
   - Evaluates:
     - `checkBudgetCeiling(proposalAmount, maxApprovedBudget)`
     - `checkDailySpending(userId, proposalAmount, dailyLimit)`
     - `checkMerchantAllowed(domain, allowlist, blocklist)`
     - `checkCurrencyMatch(authorizedCurrency, targetCurrency)`
   - Never relies on LLM heuristics.

2. **`shared/llm/` (Universal Provider Gateway):**
   - Single point of access for all model calls.
   - Handles exponential backoff retries, rate-limiting, token tracking, and structured schema generation.

3. **`shared/tasks/` (Asynchronous Task Bus):**
   - Manages task creation, persistence, and event-driven status transitions.
   - Powers the non-blocking conversational flow between GLY and background workers (ARB, PULSE).


# PALS Test Suites & Contract Verification (`tests/`)

> **Frameworks:** Vitest / Jest (TypeScript), Pytest (Python AI/RAG)  
> **Ownership:** Quality Engineering & Multi-Agent Test Systems

---

## 1. Directory Structure

```text
tests/
├── contracts/          # Strict schema compliance tests for API_CONTRACTS.md
├── integration/        # End-to-end multi-agent workflow tests
│   ├── delegation.test.ts      # GLY -> Orchestrator -> ARB async delegation
│   ├── payment_safety.test.ts  # Deterministic spending limit enforcement & PULSE order tests
│   └── rag_accuracy.test.ts    # PayPal RAG retrieval & grounding validation
├── mocks/              # Mock servers (Mock PayPal API, Mock Merchant HTML catalogs)
└── fixtures/           # Static test data, sample purchase proposals, approval tokens
```

---

## 2. Mandatory Test Invariants

1. **Contract Adherence:** Every contract defined in [API_CONTRACTS.md](../API_CONTRACTS.md) must have automated schema validation tests.
2. **Financial Safety Invariant:** Tests must prove that attempting to capture an order totaling `authorizedMaxAmount + 0.01` raises an unhandled policy exception and halts execution.
3. **Hermetic Mocks:** Integration tests must run hermetically without requiring live internet or active PayPal credentials.


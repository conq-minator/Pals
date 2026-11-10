# PALS Central Calls System (`calls/`)

> **Single Communication Gateway & Inter-Agent Dispatcher for All PALS**  
> **Status:** Architectural Specification & Extension Point (Reserved for Implementation)  
> **Location:** Root-level (`calls/`)

---

## 1. Overview & Purpose

The `calls/` system is the **single, centralized communication gateway** between all companions in the PALS ecosystem (GLY, ARB, PULSE, and DEFENDER).

Under the PALS architecture:
- No PAL may establish direct, peer-to-peer network connections, bespoke messaging channels, or private RPCs with another PAL.
- Every inter-agent request, response, status inquiry, and task handoff must pass through the `calls/` gateway.
- Each PAL only needs to know how to interact with the central `calls/` interface, completely decoupled from the internal implementation, hosting, or technology stack of any other PAL.

---

## 2. Core Operating Rules

1. **Mandatory Routing:** 100% of inter-agent communications route through `calls/`.
2. **GLY $\longleftrightarrow$ ARB Coordination:** When GLY delegates shopping research to ARB, or when ARB returns research results or requests clarification, it passes through `calls/`.
3. **PULSE & DEFENDER Coordination:** Payment execution requests and pre-payment security clearance audits pass through `calls/`.
4. **Zero Point-to-Point Coupling:** No PAL imports another PAL's internal classes, functions, or database repositories. All interactions are dispatch calls handled by `calls/`.
5. **Decoupled Handoffs:** The system handles asynchronous request-response correlation, task dispatching, timeout monitoring, and error handling.
6. **Centralized & Reusable:** The communication machinery is written once in `calls/` and consumed as a client interface by each companion.

---

## 3. Reserved Directory Structure

```text
calls/
├── README.md               # This document: Architecture & operating rules
├── CONTEXT.md              # Technical design, dispatch protocol & lifecycle
├── RESPONSIBILITIES.md     # Interface boundaries, routing invariants & error handling
├── dispatcher/             # (Reserved for Phase 1) Central call dispatcher & router
├── registry/               # (Reserved for Phase 1) PAL service discovery & method registry
└── protocol/               # (Reserved for Phase 1) Standard envelope types & serialization
```

---

## 4. Phase Notice

> [!IMPORTANT]  
> **RESERVED FOR FUTURE IMPLEMENTATION:** In Phase 0, this directory contains architectural specifications, documentation, and interface contracts only. No executable networking or messaging code is to be implemented until authorized.


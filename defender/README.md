# DEFENDER — Future Security & Credibility Companion

> **Provisional Directory Name:** `defender/`  
> **Lifecycle Phase:** Phase 4 (Architectural Extension Point Only in Phase 0–3)  
> **Status:** **PLANNED ARCHITECTURAL COMPONENT — NOT IMPLEMENTED IN PHASE 1**

---

## 1. Overview & Purpose

**DEFENDER** is the planned pre-transaction adversarial auditor, scam detector, and prompt injection defense companion of the PALS ecosystem.

In modern agentic e-commerce, malicious actors can deploy deceptive merchant domains, inject indirect prompt instructions into product reviews, or attempt client-side cart tampering. DEFENDER is architected to sit as a mandatory inspection filter immediately preceding payment execution:

$$\mathbf{ARB} \xrightarrow{\text{Purchase Proposal}} \mathbf{ORCHESTRATOR} \xrightarrow{\text{User Approval}} \mathbf{DEFENDER} \xrightarrow{\text{Audit Clearance}} \mathbf{PULSE} \xrightarrow{\text{Execution}} \mathbf{PAYPAL}$$

> [!WARNING]  
> **PHASE 0/1 NOTICE:** DEFENDER is deliberately **NOT** implemented in Phase 1. For Phases 1 through 3, this directory contains only architectural specifications, interface contracts, and pass-through test stubs. Its absence in Phase 1 must not be mistaken for an active security layer.

---

## 2. Planned Responsibilities (Phase 4)

1. **Merchant Credibility & Domain Fraud Detection:** Real-time threat intelligence lookup, whois age verification, SSL certificate transparency checks, and known scam domain blacklisting.
2. **Prompt Injection & Instruction Smuggling Defense:** Analyzing merchant DOM trees, product descriptions, and reviews for indirect prompt injection aimed at hijacking the shopping agent.
3. **Payment Manipulation Detection:** Detecting client-side DOM tampering where checkout buttons or amounts are manipulated before handoff.
4. **Behavioral Risk Scoring:** Evaluating transaction velocity, anomalous shipping destinations, and deviation from normal user purchasing patterns.
5. **Multi-Action Gatekeeper:** Emits one of four deterministic decisions:
   - `APPROVED`: Proceed directly to PULSE.
   - `REJECTED`: Block transaction immediately; alert user and Orchestrator.
   - `VERIFICATION_REQUIRED`: Require automated step-up confirmation (e.g., OTP).
   - `HUMAN_ESCALATION`: Escalate to manual human-in-the-loop review.

---

## 3. Strict Phase 0–3 Boundaries

- **Zero Executable Code in Phase 1:** No machine learning models, active network scanners, or complex heuristic engines may be written in this directory during Phase 1.
- **Interface Conformance:** All code in `defender/` in Phases 1–3 must consist strictly of TypeScript interfaces matching [API_CONTRACTS.md](../API_CONTRACTS.md) and a default pass-through mock returning `APPROVED`.

---

## 4. Module File Manifest

- [README.md](README.md) — System overview, purpose, and phasing notices.
- [CONTEXT.md](CONTEXT.md) — Threat model, adversarial vectors, and evaluation topology.
- [MEMORY.md](MEMORY.md) — Module changelog, ADRs, and Phase 4 roadmap.
- [RESPONSIBILITIES.md](RESPONSIBILITIES.md) — Strict boundary definitions and pass-through stubs.


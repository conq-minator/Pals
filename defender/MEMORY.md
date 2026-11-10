# DEFENDER Module Memory & Backlog

> **Module:** DEFENDER (Provisional Name)  
> **Status:** Phase 0 (Specification & Extension Point Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Phase Notice

- **Current Status:** Pure specification baseline. Interfaces defined in [API_CONTRACTS.md](../API_CONTRACTS.md).
- **Phasing Enforcement:** **DELIBERATELY EXCLUDED FROM PHASE 1 IMPLEMENTATION.**
- **Warning:** Do not create security models, classifiers, or detection pipelines during Phase 1. Maintain the pass-through mock until Phase 4.

---

## 2. Key Architectural Decisions (DEFENDER Scope)

### ADR-DEF-001: Strategic Placement Preceding PULSE
- **Status:** **APPROVED**
- **Decision:** Position DEFENDER between User Approval and PULSE (`User Approval -> DEFENDER -> PULSE -> PayPal`).
- **Rationale:** Ensures that even after a user approves a deal, malicious merchant redirection or price manipulation is caught before funds are committed to PayPal.

### ADR-DEF-002: Pass-Through Interface for Early Phases
- **Status:** **APPROVED**
- **Decision:** Provide an explicit interface contract in Phase 0 with a `MockDefenderService` returning `APPROVED` during Phases 1–3.
- **Rationale:** Prevents multi-agent refactoring when DEFENDER is activated in Phase 4.

---

## 3. Phase 4 Backlog

- [ ] Integrate Google Safe Browsing / VirusTotal domain intelligence APIs.
- [ ] Implement lightweight prompt injection classifier for scraped HTML nodes.
- [ ] Create domain typosquatting distance calculator (Levenshtein / Jaro-Winkler).
- [ ] Build multi-factor step-up confirmation workflow in frontend UI.


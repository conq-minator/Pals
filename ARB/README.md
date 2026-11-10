# ARB — ArbitrationPal

> **Identity:** Product Research, Comparison, Credibility Validation & Deal Arbitration Specialist  
> **Module Path:** `ARB/`  
> **Owner Agent:** ARB Specialist Agents (Antigravity / Claude / Codex)

---

## 1. Overview & Purpose

**ARB** (ArbitrationPal) is the intelligent market research, merchant validation, price comparison, and negotiation engine of the PALS ecosystem.

When a user expresses a shopping or purchasing need to GLY, the Orchestrator assigns an asynchronous task to ARB. ARB operates in the background: it searches multiple e-commerce websites, standardizes technical specifications into a comparative matrix, calculates true landed costs (item price + shipping + taxes), verifies seller credibility and domain authenticity, attempts deal negotiation where supported, and prepares purchase proposals ready for user sign-off.

ARB operates asynchronously as a background worker. It communicates solely through the shared Orchestration Engine and Task Bus.

---

## 2. Key Responsibilities

1. **Requirement Decomposition:** Parse natural-language shopping requests into strict technical and financial parameters (category, budget ceiling, required specs, delivery constraints).
2. **Multi-Merchant Market Research:** Autonomous web scraping and catalog searching across reputable e-commerce platforms.
3. **Specification Normalization & Comparison:** Collate divergent product listings into a side-by-side comparison matrix.
4. **Merchant Credibility Auditing:** Score sellers based on domain reputation, review authenticity, return policy clarity, and physical presence indicators.
5. **Legitimate Deal Arbitration:** Engage with supported merchant discount interfaces and APIs to secure legitimate savings.
6. **Purchase Intent Preparation:** Navigate merchant checkout flows up to the payment stage to extract exact landed costs and construct a structured `PurchaseProposal`.

---

## 3. Strict Boundary Rules & Prohibitions

- **NO Direct Payment Execution:** ARB has zero access to payment APIs, bank cards, or PayPal authorization flows. ARB constructs purchase proposals; it never executes them.
- **NO Fabricated Negotiations:** ARB must never falsely claim to have negotiated a deal when it simply applied a publicly available voucher or promotional discount code.
- **NO Limit Overrides:** ARB cannot propose or navigate purchases that exceed the user's defined budget ceiling.
- **NO PayPal Knowledge Handling:** General PayPal questions must be left to GLY.

---

## 4. Module File Manifest

- [README.md](README.md) — System overview, purpose, and interfaces.
- [CONTEXT.md](CONTEXT.md) — Scraping pipelines, negotiation state machine, and browser automation architecture.
- [MEMORY.md](MEMORY.md) — Module changelog, ADRs, and active development state.
- [RESPONSIBILITIES.md](RESPONSIBILITIES.md) — Strict boundary definitions, constraints, and delegation rules.


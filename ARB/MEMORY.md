# ARB Module Memory & Change Log

> **Module:** ARB (ArbitrationPal)  
> **Status:** Phase 0 (Specification Baseline Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Active Focus

- **Current Status:** Architecture and interface contracts defined. Scraping guidelines, specification normalization models, and negotiation guardrails documented.
- **Active Focus:** Awaiting Phase 1 authorization to construct the initial entity extraction and mock scraper framework.

---

## 2. Key Architectural Decisions (ARB Scope)

### ADR-ARB-001: Headless Automation Engine Selection
- **Status:** **APPROVED**
- **Decision:** Playwright chosen as the core browser automation engine for desktop scraping and checkout navigation.
- **Rationale:** Better isolation, built-in network interception, trace recording, and multi-platform resilience compared to Puppeteer or raw Selenium.

### ADR-ARB-002: Landed Cost Primacy
- **Status:** **APPROVED**
- **Decision:** ARB will rank and compare products strictly on total landed cost (item + shipping + taxes), never on sticker price alone.
- **Rationale:** Prevents deceptive listings with low sticker prices and exorbitant shipping fees from topping user recommendations.

---

## 3. Backlog for Phase 1 & Phase 2

- [ ] Implement query entity extractor with Zod schema validation (`ARB/extractors/`).
- [ ] Create Playwright merchant adapter interface (`ARB/scrapers/`).
- [ ] Implement mock merchant catalog for integration testing without external network dependencies.
- [ ] Build landed cost calculation utility.
- [ ] Implement merchant credibility heuristic calculator (`ARB/scoring/`).


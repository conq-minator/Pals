# ARB Module Memory & Change Log

> **Module:** ARB (ArbitrationPal)  
> **Status:** Phase 0 (Specification Baseline Established)  
> **Last Updated:** 2026-11-10

---

## 1. Current Status & Active Focus

- **Current Status:** **ARB Implementation Complete (Phase 1 Baseline)**.
- **Completed Components:**
  - `ARB/extractors/query_extractor.ts`: Natural language query entity extractor (budget, currency, specs, brands, pincode, trust thresholds).
  - `ARB/extractors/spec_normalizer.ts`: Multi-merchant specification normalizer and constraint satisfaction evaluator.
  - `ARB/scoring/trust_scorer.ts`: 0–100 Merchant Credibility & Trust Scoring model with signal weights and trust tiers.
  - `ARB/negotiation/deal_arbitrator.ts`: Legitimate deal arbitrator distinguishing public vouchers from dynamic negotiations.
  - `ARB/providers/catalog_provider.ts`: Multi-merchant catalog provider (Amazon, Croma, Reliance Digital) with landed cost calculation.
  - `ARB/checkout/proposal_builder.ts`: Purchase proposal builder with 15-minute TTL and price invariant assertions.
  - `ARB/service.ts`: Core `ArbService` registered with Central Calls System (`calls/`) for `research.start`, `extract.requirements`, and `purchase_prep.start`.

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

- [x] Implement query entity extractor with natural language parsing (`ARB/extractors/query_extractor.ts`).
- [x] Implement spec normalizer and constraint checking (`ARB/extractors/spec_normalizer.ts`).
- [x] Implement merchant credibility heuristic calculator (`ARB/scoring/trust_scorer.ts`).
- [x] Implement deal arbitrator and voucher validator (`ARB/negotiation/deal_arbitrator.ts`).
- [x] Implement multi-merchant catalog providers with true landed cost calculation (`ARB/providers/`).
- [x] Implement purchase proposal builder with 15-minute TTL (`ARB/checkout/proposal_builder.ts`).
- [x] Integrate with Central Calls System (`calls/`) for all inter-agent invocations.
- [ ] Connect Playwright live crawler for active web scraping in Phase 2.
- [ ] Implement SOCKS5 proxy egress isolation in `ARB/scrapers/egress.ts` for Phase 2.


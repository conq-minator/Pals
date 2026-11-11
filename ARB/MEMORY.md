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

- [x] Everyday catalog for food delivery, quick-commerce groceries, pharmacy and PC memory (`ARB/providers/everyday_catalog.ts`), with regression tests in `tests/arb_everyday.test.ts`.
- [ ] Replace indicative catalog prices with live merchant/affiliate data sources (Amazon PA-API, Flipkart Affiliate, SerpAPI-style shopping search).
- [ ] Remove or verify voucher codes in `deal_arbitrator.ts` — the current index is illustrative, not verified against merchants.

### ADR-ARB-003: No Fabricated Listings
- **Status:** **APPROVED**
- **Decision:** When ARB has no catalog coverage and the live crawl returns nothing, it returns zero listings plus merchant search links, instead of synthesizing generic listings with estimated prices.
- **Rationale:** The previous universal fallback produced items like "Bandage (Authentic Retail Edition)" for ₹2,349 that could flow into a PurchaseProposal and a real payment.

### ADR-ARB-004: Anti-Fabrication & Concurrency Hardening (Step 1 Complete)
- **Status:** **APPROVED**
- **Decision:** 
  1. Fixed Item 21 (`this.lastQuery` race condition): Removed mutable query state on `ArbService` and passed query explicitly into `generateComprehensiveReport`.
  2. Fixed Item 15 (Fake Transcripts): Removed simulated `MERCHANT_BOT` chat transcripts and fake `LIVE_CHATBOT` concessions from `deal_arbitrator.ts`. All discounts must be genuine public vouchers (`PUBLIC_COUPON`) or verified competitor price-match policies (`PRICE_MATCH_CONCESSION`).
  3. Fixed Item 6 (Spec Templating & Fake URLs): Replaced `${ramTarget}GB` title interpolation with authentic static hardware specs (e.g., 16GB RAM models) and replaced fake `B0DEXAMPLE` URLs with valid merchant search links.
  4. Added regression test suite `tests/arb_anti_fabrication.test.ts`. All 18 tests passing.

### ADR-ARB-005: Two-Stage Live Crawling, Canonical Product Identity & Landed Cost Calculation (Step 2 Complete)
- **Status:** **APPROVED**
- **Decision:**
  1. **Item 7 (Two-Stage Crawler & Product Verifier):** Created `ARB/providers/product_verifier.ts` and refactored `ARBWebCrawler`. Stage 1 discovers candidate product URLs across target merchants; Stage 2 inspects pages, extracts structured `schema.org/Product` and `Offer` JSON-LD (and OpenGraph fallback), verifies in-stock availability and true selling price (rejecting misleading EMI rates and accessory prices). Implemented category-aware TTL caching (5 minutes for food/grocery, 2 hours for tech/electronics).
  2. **Item 8 (Canonical Product Identity):** Created `ARB/extractors/canonical_product.ts`. Distinguishes critical hardware variants (e.g., CL30 vs CL36 CAS latency, DDR4 vs DDR5, 16GB vs 32GB, SO-DIMM vs Desktop) while matching the same product across different merchant naming conventions. Replaced crude `.slice(0, 30)` deduplication with canonical keys (`brand:model:variant`). Implemented `groupOffersByProduct` to compare identical products across merchants, identify the lowest landed price, calculate cross-merchant arbitration savings, and display comparisons in arbitration reports.
  3. **Item 18 (True Landed Cost & Pincode/Fee Scheduling):** Created `ARB/pricing/landed_cost.ts`. Replaced ₹0 shipping and ₹0 tax assumptions with merchant-specific fee schedules:
     - Indian E-Commerce: Free delivery on orders >= ₹499/₹500, else standard ₹40-50 shipping. Retail prices include GST.
     - Food Delivery & Quick-Commerce: Accounts for delivery fees, ₹15 packaging, ₹5 platform fee, and 5% restaurant GST.
     - US Retailers: Calculates estimated ~7.5% sales tax and standard shipping below $35/$50.
     - Pincode & Cross-Border: Validates Indian 6-digit PIN and US 5-digit ZIP. Flags regional unserviceability (e.g. quick-commerce to US ZIP) and adds international shipping + 22% import duty for US stores shipping to Indian pincodes.
     - Itemized fee lines mark components as confirmed vs estimated.
  4. Added comprehensive test suite `tests/arb_real_data.test.ts`. All 30 tests in the project passing hermetically.

### ADR-ARB-006: LLM Understanding, Spec Schemas & Constraint Enforcement (Step 3 Complete)
- **Status:** **APPROVED**
- **Decision:**
  1. **Item 9 (Structured Zod & LLM Extraction):**
     - Upgraded `ARBQueryExtractor` to support structured Zod validation (`StructuredUserRequirementsSchema`) and async LLM extraction (`extractWithLLM`) with deterministic offline cross-checking and fallback.
     - Fixed `iphone 15 128gb`: Correctly extracts 128GB as internal storage, never as RAM (`ram_gb: undefined`).
     - Fixed `band aid usd`: Detects standalone currency codes (`USD`, `EUR`, `GBP`, `INR`), setting currency to USD without requiring a budget prefix.
     - Fixed `2 pizzas`: Extracts quantity (`quantity: 2`).
     - Fixed `16GB, ideally 32GB`: Separates hard must-haves (`mandatorySpecifications: { ram_gb: 16 }`) from soft nice-to-haves (`softPreferences: { ram_gb: 32 }`).
     - Added budget flexibility detection (`STRICT` vs `FLEXIBLE_10_PERCENT`).
  2. **Item 10 (Extracted Requirements Enforcement & Unverified Marking):**
     - Enforces `storage`, `resolution`, `gpu`, `refresh_rate_hz`, and `preferredBrands` in `spec_normalizer.ts` and `service.ts`.
     - When a listing lacks an explicit requirement (e.g. 4K resolution or dedicated GPU), it is marked as `unverifiedSpecs: [...]` and appended to `cons` rather than passing silently.
     - Enforces `preferredBrands` in listing ranking: listings matching user preferred brands receive top priority and pros annotations.
  3. **Item 12 (Category-Specific Spec Schemas):**
     - Replaced laptop-only heuristics in `ARBSpecNormalizer` with domain-specific schemas:
       - `pc_memory`: Capacity (GB), DDR generation (DDR4/5), RAM speed (MHz), CAS latency (CL), and form factor (desktop vs SO-DIMM).
       - `laptops`: Fixed storage pattern to support up to 4 digits (e.g., 2048GB SSD, 1024GB, 1TB, 2TB), GPU model, display size, and resolution hierarchy (4K UHD > 2K QHD > FHD).
       - `food_delivery`: Dietary classification (`veg` vs `non-veg` vs `vegan`), size (large, medium, regular), and servings.
       - `pharmacy`: Active salt, strength (mg), and pack count.
  4. Added test suite `tests/arb_understanding.test.ts` (12 tests). All 42 tests across the repository pass hermetically.


### ADR-ARB-007: Agent Reasoning Loop, Self-Verification, Ambiguity Detection, and Lifecycle Interaction (Steps 4 & 5 Complete)
- **Status:** **APPROVED**
- **Decision:**
  1. **Item 1 (Plan -> Act -> Observe -> Decide Reasoning Loop):** Created `ARB/agent/reasoning_loop.ts` (`ARBAgentLoop`). Replaced the linear pipeline with an adaptive multi-step agent reasoning cycle that plans, discovers merchants, normalizes specifications, audits candidate offers, and adaptively relaxes constraints.
  2. **Item 2 (Evidence-Backed Self-Verification):** Created `ARB/agent/self_verifier.ts` (`ARBSelfVerifier`). Audits top picks against extracted evidence, checks hard requirements, attaches confidence tiers (`CONFIRMED`, `ESTIMATED`, `UNVERIFIED`), discards non-compliant listings, and guarantees no unbacked claims appear in the report.
  3. **Item 3 (Ambiguity Detection & Disambiguation):** Created `ARB/interaction/ambiguity_detector.ts` (`ARBAmbiguityDetector`). Detects underspecified queries ("ram", "pizza", "bandage", "mac mini") and emits `research.needs_input` events with 2–4 concrete options via `calls/` to GLY.
  4. **Item 4 (Stateful Follow-Up Refinement):** Created `ARB/interaction/task_state_store.ts` (`ARBTaskStateStore`). Maintains per-task research state and provides `refineResearch` (`research.refine` in `calls/`) supporting natural language edits ("cheaper", "only veg", "same but 32gb", "skip Flipkart") without restarting from zero.
  5. **Item 5 (Real-Time Progress & Cancellation):** Created `ARB/interaction/progress_emitter.ts` (`ARBProgressEmitter`). Emits lifecycle progress events (`task.progress` in `calls/`) at each step of the loop and supports clean task cancellation.
  6. **Item 14 (Adaptive Alternative Discovery):** Created `ARB/agent/alternative_finder.ts` (`ARBAlternativeFinder`). When 0 items qualify within strict constraints, discovers the closest budget stretch (+₹X) and entry spec step-downs within budget.
  7. Added test suite `tests/arb_agent_loop.test.ts` (5 tests). All 47 tests passing hermetically.

### ADR-ARB-008: Semantic Relevance, Multi-Factor Ranking, Verifiable Trust Scoring, PULSE Handoff, Memory & Benchmark (Steps 6 & 7 Complete)
- **Status:** **APPROVED**
- **Decision:**
  1. **Item 11 (Semantic Relevance Scoring):** Created `ARB/extractors/relevance_scorer.ts` (`ARBRelevanceScorer`). Evaluates token significance, category intent, accessory guards (e.g., rejecting phone cases for iPhone queries), and component-vs-system boundaries (e.g., rejecting laptops when standalone RAM modules are requested), replacing brittle hardcoded string checks.
  2. **Item 13 (Multi-Factor Ranking & Labelled Picks):** Created `ARB/ranking/multi_factor_ranker.ts` (`ARBMultiFactorRanker`). Evaluates listings across price efficiency, delivery speed (weighted heavily for food/quick-commerce), spec fit, trust, and unit value. Assigns labelled picks (**👑 Best Overall**, **💰 Cheapest Option**, **⚡ Fastest Delivery**) with transparent justifications.
  3. **Item 16 (Verifiable Trust Scoring):** Enhanced `ARB/scoring/trust_scorer.ts` (`ARBTrustScorer`). Computes deterministic scores from verifiable merchant signals (domain authority tier, authorized dealership, physical presence, return policies, buyer-protected payment support, SSL validity, and domain longevity) with explicit reason breakdowns.
  4. **Item 19 (Complete PULSE Purchase Preparation):** Enhanced `ARB/checkout/proposal_builder.ts` (`ARBProposalBuilder`) and `shared/types/index.ts`. Generates actionable purchase proposals containing `directCheckoutUrl`, `prefilledShipping` (destination pincode, SKU), `supportedPaymentMethods` (PayPal, UPI, Credit Card), 15-minute TTL, and formatted `pulseHandoffPayload` ready for immediate `PULSE:payment.execute` consumption.
  5. **Item 20 (Persistent User Preference Memory):** Created `ARB/memory/preference_store.ts` (`ARBPreferenceStore`). Persists user preferences (dietary restrictions, preferred brands, excluded merchants, default pincode, currency) across sessions and automatically enriches incoming research tasks.
  6. **Item 22 (Ground-Truth Evaluation Benchmark):** Created `ARB/benchmark/eval_suite.ts` (`ARBEvaluationBenchmark`) and test suite `tests/arb_eval_benchmark.test.ts`. Verifies 100% constraint satisfaction, 0% fabrication rate, 100% ambiguity detection, 100% landed cost completeness, and 100% PULSE handoff readiness with an overall benchmark score >= 95.
  7. All 53 tests in the monorepo pass hermetically in ~2.4 seconds with zero network flakiness.

### ADR-ARB-009: Production Hardening Across Sections A, B, and C (All 16 Flaws Resolved)
- **Status:** **APPROVED**
- **Decision:**
  1. **Section A (Pricing Anti-Fabrication & Honest Quoting):**
     - **Item 1:** Candidate voucher codes are never auto-deducted from quoted prices without cart validation. `arbitrateDeal` returns `candidateCodes` with `discountedPrice = basePrice`, and candidate codes are presented in `pros` as checkout suggestions.
     - **Item 2:** Price-matching arbitration moved out of merchant providers into `ARBAgentLoop` after canonical grouping (`groupOffersByProduct`). When $\ge 2$ merchants offer the same canonical product, the cheapest listing is passed as `competitorProof` to competitor listings and noted as a `"Price-match opportunity on [domain]"` without unauthorized price deductions.
     - **Item 3:** All fee line items in `ARBLandedCostCalculator` are marked `confirmed: false` unless verified from live cart data.
     - **Item 4:** `ARBSelfVerifier` assigns confidence tiers rigorously: claims sourced from structured `schema.org` metadata receive `CONFIRMED`; title-parsed heuristics receive `ESTIMATED`.
     - **Item 5:** Replaced invented payment methods with `KNOWN_MERCHANT_PAYMENTS` mapping authentic payment rails (PayPal/Credit Card for US tech retailers; UPI/Cards/NetBanking for Indian retailers) and leaving unknown merchants undefined.
  2. **Section B (Activated & Connected Agent Capabilities):**
     - **Item 6:** Fully utilized extracted fields: `softPreferences` boost `specFit` (+10 each) and record annotations; `deliveryBy` checks parsed delivery ETAs and rewards/penalizes `deliverySpeed`; `budgetFlexibility` retries research with a 10% budget stretch when 0 items qualify under strict ceiling, labeling results accordingly.
     - **Item 7:** Refactored `ARBAgentLoop.run` into a bounded adaptive reasoning cycle (`while (iteration < maxIterations && !done)`) that observes intermediate outputs, widens merchant providers, adapts budgets, and enriches top picks.
     - **Item 8:** Implemented `FetchLLMProvider` in `shared/llm/index.ts` connecting to Gemini and OpenAI-compatible REST endpoints, with graceful `MockLLMProvider` fallback for offline tests.
     - **Item 9:** Implemented ambiguity pausing: when queries are underspecified, the loop sends `research.needs_input` via `calls/`, saves state, and returns early with `needsInput: true`. Added `calls/` handler `ARB:research.answer` and `arb.answerResearch` to resume execution seamlessly.
     - **Item 10:** Added `clearTask(taskId)` to `ARBProgressEmitter`, with cancellation checks at every loop step and guaranteed task cleanup in a `finally` block.
     - **Item 11:** Renamed composite score winner badge from `'👑 Best Overall'` to `'💎 Best Value'` to avoid contradictions with landed-cost primacy.
     - **Item 12:** Added `/api/refine` and Server-Sent Events `/api/progress/:taskId` endpoints to `ARB/ui/server.ts`, and ensured `/api/search` returns `taskId`.
  3. **Section C (Robustness & Integrity):**
     - **Item 13:** Added 1-hour TTL eviction and 500-task max cap to `ARBTaskStateStore`; added 1000-user max cap with LRU eviction to `ARBPreferenceStore`.
     - **Item 14:** `ARBTrustScorer` defaults unknown merchant domains to `sslValid: false` and `domainAgeYears: 0` until verified.
     - **Item 15:** `ARBAlternativeFinder` sorts step-down alternatives by number of satisfied requirements and explicitly surfaces `failedReasons[0]`.
     - **Item 16:** Live web crawler verified with two-stage snippet parsing and error resilience.
  4. **Test Verification:** All 85 unit, regression, and benchmark tests pass cleanly in Node.js test runner with 0 failures and 0 typecheck errors.

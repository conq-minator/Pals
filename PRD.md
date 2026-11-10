# PALS Product Requirements Document (PRD)

> **Document Version:** 1.0.0  
> **Lifecycle Phase:** Phase 0 (Specification & Architecture)  
> **Authors:** Principal Software Architect & Multi-Agent Engineering Group

---

## 1. Product Vision & Executive Summary

**PALS** (Personal AI Life & Shopping Companions) is a next-generation commerce platform that unifies intelligent product discovery, merchant validation, autonomous price negotiation, PayPal ecosystem expertise, and secure digital checkout into a single conversational interface.

Traditional online shopping forces consumers to browse multiple tabs, research unfamiliar sellers, calculate landed costs, find working discount codes, and decipher complex return/dispute policies. PALS removes this cognitive friction by providing a trusted companion that works for the consumer, continuously safeguarding their budget, privacy, and purchase security.

---

## 2. Problem Statement & Target Personas

### 2.1 Problem Statements
1. **Merchant Fragmentation & Deceptive Pricing:** E-commerce listings often conceal delivery fees, bundle unwanted warranties, or disguise grey-market variants.
2. **Payment Ecosystem Confusion:** Consumers frequently misunderstand payment authorizations, hold statuses, currency conversion fees, and buyer protection policies.
3. **Friction in Deal Arbitration:** Negotiating or finding legitimate, verified promotional discounts across merchants is tedious and time-consuming.
4. **Security & Prompt Injection Vulnerabilities:** Emerging autonomous commerce agents risk malicious checkout manipulation, deceptive merchant redirects, or unauthorized spending.

### 2.2 Target Personas
- **The Value-Maximizing Shopper:** Wants the best verified deal without spending hours scanning dozens of websites and testing expired promo codes.
- **The PayPal Ecosystem User:** Regularly sends/receives cross-border payments, manages digital invoices, or requires immediate clarity on transaction holds and buyer protection claims.
- **The Security-Conscious Consumer:** Demands hard, deterministic spending ceilings and transparent human-in-the-loop sign-offs before any money leaves their account.

---

## 3. Core Product Goals & KPIs

1. **Zero Unapproved Monetary Leakage:** 100% of financial transactions must have deterministic, immutable user authorizations matching the exact landed amount.
2. **Conversational Fluidity:** 0ms blocking latency on the chat UI during background research or scraping workflows.
3. **Authoritative PayPal Knowledge:** 95%+ retrieval accuracy on PayPal support, disputes, fees, and API queries via grounded RAG.
4. **Verified Merchant Recommendations:** 100% of ARB recommended listings must undergo credibility scoring and out-of-the-box landed cost calculations.

---

## 4. Functional Requirements

### 4.1 System-Wide & Conversational Gateway Requirements
- **FR-SYS-001 (Single Entry Gateway):** All user interactions must initiate through GLY. Users cannot address ARB, PULSE, or DEFENDER directly.
- **FR-SYS-002 (Non-Blocking Asynchronous Delegation):** GLY must immediately acknowledge long-running delegations (e.g., product research) and remain open for concurrent conversations.
- **FR-SYS-003 (Event-Driven Notifications):** When background agents complete tasks, progress events and final results must stream back into the conversation seamlessly.
- **FR-SYS-004 (Central Task Management):** Every delegated task must maintain a traceable lifecycle (`PENDING`, `ACCEPTED`, `RESEARCHING`, `AWAITING_INPUT`, `AWAITING_APPROVAL`, `COMPLETED`, `FAILED`, `CANCELLED`).
- **FR-SYS-005 (Deterministic Policy Enforcement):** Hard budget ceilings, merchant allowlists, and daily caps must be validated deterministically by code—never left to LLM discretion.
- **FR-SYS-006 (Central Calls Gateway):** All inter-agent communication, task handoffs, queries, and event dispatches between GLY, ARB, PULSE, and DEFENDER must pass through the root-level `calls/` system. No PAL may establish independent point-to-point communication mechanisms.

### 4.2 GLY (GuidePal) Requirements
- **FR-GLY-001 (PayPal Knowledge RAG):** Retrieve and explain official PayPal documentation covering account creation, KYC, fees, disputes, buyer protection, developer APIs, and invoices.
- **FR-GLY-002 (Intent Classification & Routing):** Accurately classify user inputs into:
  - Direct PayPal Guidance (Handled internally by GLY RAG).
  - Shopping / Market Research (Delegated to ARB).
  - Transaction Status / Balance Inquiry (Delegated to PULSE via Orchestrator).
  - Checkout Execution (Routed through User Approval $\rightarrow$ Defender $\rightarrow$ PULSE).
- **FR-GLY-003 (Conversational History Continuity):** Maintain full conversational context across multi-turn inquiries even while background tasks are executing.

### 4.3 ARB (ArbitrationPal) Requirements
- **FR-ARB-001 (Requirement Extraction):** Extract structured search entities (category, budget, technical specifications, brand restrictions, delivery timeframe) from natural language.
- **FR-ARB-002 (Multi-Merchant Research):** Scan and parse multiple merchant listings to aggregate prices, availability, shipping fees, and warranty terms.
- **FR-ARB-003 (Merchant Credibility Scoring):** Score sellers on domain age, customer feedback, SSL validity, and return policy transparency.
- **FR-ARB-004 (Negotiation & Coupon Arbitration):** Engage with supported merchant discount interfaces or APIs to obtain optimal pricing. Never falsely present standard coupons as negotiated deals.
- **FR-ARB-005 (Purchase Intent Preparation):** Navigate the target merchant's checkout flow to aggregate exact landed cost, taxes, and shipping, outputting a structured Purchase Proposal for user review.

### 4.4 PULSE (PaymentPal) Requirements
- **FR-PULSE-001 (PayPal OAuth & Security):** Manage secure token lifecycles for PayPal sandbox and production environments.
- **FR-PULSE-002 (Order Lifecycle Management):** Create orders, authorize transactions, capture funds, and process refunds via PayPal v2 Checkout APIs.
- **FR-PULSE-003 (Deterministic Budget Validation):** Validate that proposed order amounts do not exceed the cryptographic approval token signed by the user.
- **FR-PULSE-004 (Webhook Ingestion & Audit Ledger):** Ingest and verify PayPal webhooks to maintain an immutable transaction ledger and generate digital receipts.

### 4.5 DEFENDER (Phase 4 Security Layer Requirements)
- **FR-DEF-001 (Merchant Anomaly Auditing):** Scan proposed merchant domains against real-time threat intelligence feeds prior to checkout approval.
- **FR-DEF-002 (Prompt Injection Defense):** Detect and neutralize indirect prompt injections hidden within merchant page DOMs or reviews.
- **FR-DEF-003 (Pre-Payment Risk Scoring):** Emit risk scores and mandate multi-factor step-up verification if suspicious patterns are identified.

---

## 5. End-to-End User Journeys

### Journey 1: PayPal Guidance (GLY Direct)
1. **User asks:** *"What are the fees if I receive an international payment from the US in INR?"*
2. **GLY:** Classifies intent as PayPal Knowledge. Queries vector database for PayPal international fee schedules and currency conversion spreads.
3. **GLY:** Formulates an accurate, grounded breakdown with official documentation citations.

### Journey 2: Shopping Research & Background Continuity
1. **User asks:** *"Find me an ultralight laptop under ₹70,000 with 16GB RAM for programming."*
2. **GLY:** Acknowledges request: *"I've asked ARB to research trusted merchants for 16GB ultralight laptops under ₹70,000. I'll notify you when ready! Feel free to ask me anything else in the meantime."*
3. **Orchestrator:** Creates Task `tsk_8892` and dispatches it to ARB.
4. **ARB:** Queries merchant engines, verifies specs, calculates landed shipping costs, and scores merchant credibility.
5. **Meanwhile (User):** *"Hey GLY, can I use PayPal Pay in 4 for electronics?"*
6. **GLY:** Answers instantly using its PayPal RAG engine without waiting for ARB.
7. **ARB:** Finishes research and submits top 3 ranked options to Orchestrator.
8. **GLY:** Interjects gently into the feed: *"ARB has finished researching laptops! Here are the 3 top-rated options meeting all your specs."*

### Journey 3: Checkout Authorization & Purchase Flow
1. **User:** *"I want to buy Option 2 (₹68,500 on Merchant X)."*
2. **GLY:** Delegates checkout preparation to ARB.
3. **ARB:** Navigates to Merchant X checkout, determines exact taxes and shipping (Total: ₹69,100), and returns an unapproved Purchase Proposal.
4. **GLY:** Prompts User with an interactive Approval Card:
   - Item: Laptop Model Y (16GB RAM)
   - Merchant: Merchant X (Trust Score: 94/100)
   - Base Price: ₹68,500 | Shipping: ₹600 | Total: ₹69,100
   - Prompt: *"Click to Authorize Payment of ₹69,100 via PayPal."*
5. **User:** Reviews and clicks **Authorize**. Frontend generates a signed User Approval Token.
6. **Orchestrator:** Validates token against deterministic spending policies.
7. **DEFENDER (Phase 4):** Evaluates merchant domain & transaction risk $\rightarrow$ Returns `APPROVED`.
8. **PULSE:** Validates amount $\le$ approved token cap. Calls PayPal Orders API to create and capture the order.
9. **GLY:** Delivers the digital receipt and confirmation number to the user.

---

## 6. Non-Functional Requirements

### 6.1 Security & Compliance
- **Zero Raw Credential Storage:** No credit card numbers, CVVs, or PayPal passwords may ever touch application disks or databases.
- **Deterministic Bounds Enforcement:** Spending caps must execute in isolated TypeScript/Python validation routines before network calls are dispatched.
- **Ephemeral Sandbox Execution:** Headless browser automations in ARB must run in sandboxed container instances with strict egress controls.

### 6.2 Performance & Scalability
- **Chat Gateway Response Latency:** First-token streaming latency for GLY direct queries $< 800\text{ms}$.
- **Asynchronous Task Capacity:** The Orchestrator task bus must support hundreds of concurrent background research jobs without degrading GLY conversational response times.
- **RAG Retrieval Speed:** Vector semantic search $< 150\text{ms}$ at 99th percentile.

---

## 7. Technology Stack Evaluation & Status

All architectural technologies must be classified into one of three distinct statuses:
1. **APPROVED:** Formally adopted after architectural review.
2. **PROPOSED:** Strong architectural candidate, recommended for Phase 1.
3. **UNDER EVALUATION:** Multiple viable candidates undergoing benchmark comparison.

| Layer | Component | Candidate / Selection | Status | Architectural Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Language** | **Backend Services** | TypeScript / Node.js (v20+) | **APPROVED** | Strong typing, shared interfaces with frontend, vast ecosystem for PayPal SDK and browser automation. |
| **Language** | **AI / RAG Services** | Python 3.11+ / FastAPI | **APPROVED** | De-facto standard for vector embeddings, LangChain/LlamaIndex pipelines, and agent orchestration. |
| **Frontend** | **Web Interface** | Next.js 14+ (App Router, React, TailwindCSS) | **APPROVED** | High-performance server-side rendering, streaming UI, WebSocket support, rich component libraries. |
| **Database** | **Relational DB** | PostgreSQL 16+ | **APPROVED** | ACID-compliant transaction records, user policies, immutable audit logs. |
| **Database** | **Vector Store** | `pgvector` (PostgreSQL extension) | **APPROVED** | Avoids introducing separate vector infrastructure; simplifies operational overhead for GLY's RAG docs. |
| **Messaging** | **Task Queue / Bus** | Redis 7+ (Streams / BullMQ) | **PROPOSED** | High-throughput, low-latency asynchronous background task queuing and Pub/Sub event broadcasting. |
| **Messaging** | **Alt: DB Notifications** | PostgreSQL `LISTEN/NOTIFY` | **UNDER EVALUATION** | Simpler infrastructure if Redis can be omitted for small-scale deployments. |
| **Automation** | **Headless Browser** | Playwright (Node.js/Python) | **APPROVED** | Modern, fast, resilient cross-browser automation with native tracing and network mocking. |
| **LLM Gateway** | **Model Provider** | Google Gemini (2.5 Flash / Pro) + Anthropic Claude | **PROPOSED** | Flash for fast gateway routing; Pro / Claude 3.5 Sonnet for complex multi-merchant price arbitration. |
| **Payments** | **PayPal Integration** | PayPal REST v2 API + PayPal Agent Toolkit | **APPROVED** | Official PayPal integration interfaces supporting secure OAuth, orders, captures, and webhooks. |


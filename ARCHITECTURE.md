# PALS System Architecture Specification

> **Document Version:** 1.0.0  
> **Lifecycle Phase:** Phase 0 (Specification & Architecture)  
> **Target Audience:** System Architects, Multi-Agent Engineering Systems (Google Antigravity, Claude Code, OpenAI Codex)

---

## 1. System Topology Overview

PALS is designed as a **Modular Hub-and-Spoke Architecture** with an **Asynchronous Conversational Gateway**. 

The system separates conversational responsiveness from high-latency background operations (web scraping, merchant negotiation, multi-factor payment authorization).

```mermaid
graph TD
    subgraph Client Layer
        WebClient[Web Application Next.js]
        MobileClient[Mobile / Extension Client]
    end

    subgraph Gateway Layer
        GLY[GLY Gateway & GuidePal]
        WSHandler[WebSocket / SSE Event Streamer]
    end

    subgraph Central Communication Gateway
        CallsSystem["CENTRAL CALLS SYSTEM (calls/)"]
    end

    subgraph Core Platform Services
        Orchestrator[Central Orchestrator]
        TaskQueue[Task Bus & State Store Redis/PG]
        PolicyEngine[Deterministic Spending & Policy Engine]
        SharedLLM[Shared LLM Gateway & Tool Registry]
        SharedDB[(Relational DB & Audit Store)]
        VectorDB[(pgvector PayPal KB)]
    end

    subgraph Autonomous Worker PALs
        ARB[ARB: ArbitrationPal Engine]
        PULSE[PULSE: PaymentPal Engine]
        DEFENDER["DEFENDER: Security Auditor (Phase 4 Extension)"]
    end

    subgraph External Providers
        PayPalAPI[PayPal REST / Agent Toolkit API]
        Merchants[Merchant Websites & Public Catalogs]
    end

    WebClient <-->|HTTP / WS| WSHandler
    MobileClient <-->|HTTP / WS| WSHandler
    WSHandler <--> GLY
    
    GLY <-->|All Inter-PAL Invocations| CallsSystem
    ARB <-->|All Inter-PAL Invocations| CallsSystem
    PULSE <-->|All Inter-PAL Invocations| CallsSystem
    DEFENDER <-->|All Inter-PAL Invocations| CallsSystem
    
    CallsSystem <-->|Task Scheduling & Correlation| Orchestrator
    GLY -.->|Knowledge Queries| VectorDB
    
    Orchestrator <-->|Pub/Sub Task Lifecycle| TaskQueue
    Orchestrator <-->|Deterministic Checks| PolicyEngine
    Orchestrator <-->|Transactions & Audit Logs| SharedDB
    
    TaskQueue <-->|Background Research Jobs| ARB
    ARB -.->|Scraping & Deal Arbitration| Merchants
    
    CallsSystem -->|Pre-Payment Check| DEFENDER
    CallsSystem -->|Cleared Payment Execution| PULSE
    PULSE -->|Order Creation & Capture| PayPalAPI
```

---

## 2. The Conversational Gateway & Asynchronous Task Pattern

### 2.1 The GLY Gateway Pattern
To ensure the user experiences PALS as a unified, seamless assistant:
1. **Single Point of Ingestion:** Every message enters via GLY.
2. **Zero-Latency Non-Blocking Delegation:** When GLY recognizes a shopping or research intent, it formulates a structured task request, enqueues it with the Orchestrator, returns an immediate conversational acknowledgment, and releases the conversational lock.
3. **Out-of-Band Notification Streaming:** Background workers update task status in the central Task Store. As status transitions occur (`RESEARCHING`, `COMPLETED`, `AWAITING_INPUT`), events are dispatched through the Orchestrator to GLY, which streams friendly update cards into the active conversation thread.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend
    participant GLY
    participant Calls as Central Calls Gateway (calls/)
    participant Orch as Orchestrator
    participant TaskBus
    participant ARB
    participant VectorDB

    Note over User, Frontend: User asks for product research
    User->>Frontend: "Find me a wireless mechanical keyboard under ₹5,000"
    Frontend->>GLY: POST /chat/message
    GLY->>Calls: Dispatch Call: callee=ARB, action=research.start
    Calls->>Orch: Schedule Task(Type=RESEARCH, Budget=5000)
    Orch->>TaskBus: Enqueue Task(tsk_301, PENDING)
    Calls-->>GLY: Call Ack(callId, tsk_301)
    GLY-->>Frontend: "I've asked ARB to research top-rated keyboards under ₹5,000. Feel free to chat while it searches!"
    
    Note over TaskBus, ARB: Background Worker Picks Up Task
    TaskBus->>ARB: Execute(tsk_301)
    ARB->>ARB: Scraping & Merchant Verification
    
    Note over User, VectorDB: User chats with GLY in parallel
    User->>Frontend: "Do you know what PayPal Buyer Protection covers?"
    Frontend->>GLY: POST /chat/message
    GLY->>VectorDB: Semantic Search(Query="Buyer Protection coverage")
    VectorDB-->>GLY: Relevant Documentation Chunks
    GLY-->>Frontend: Detailed explanation of Buyer Protection
    
    Note over ARB, Frontend: ARB Finishes & Results Delivered
    ARB->>Calls: Dispatch Call: callee=GLY, action=task.completed
    Calls->>GLY: Deliver Payload(tsk_301, Options=[KB1, KB2, KB3])
    GLY-->>Frontend: WebSocket Push: "ARB has found 3 great keyboards under ₹5,000! Check them out below."
```

---

## 3. Financial Safety & The Payment Execution Pipeline

### 3.1 Strict Payment Pipeline Topology
Financial transactions require verifiable human approval and multiple deterministic checks. Under no circumstance may any PAL bypass the validation chain:

$$\mathbf{ARB} \xrightarrow{\text{Purchase Proposal}} \mathbf{ORCHESTRATOR} \xrightarrow{\text{User Interactive Card}} \mathbf{USER} \xrightarrow{\text{Signed Approval}} \mathbf{POLICY\ ENGINE} \xrightarrow{\text{Pre-Payment Audit}} \mathbf{DEFENDER} \xrightarrow{\text{Cleared Order}} \mathbf{PULSE} \xrightarrow{\text{Capture}} \mathbf{PAYPAL}$$

```mermaid
flowchart TD
    A[ARB: Generates Purchase Proposal] --> B[Orchestrator: Ingests Proposal]
    B --> C[Frontend: Presents Interactive Approval Card]
    C --> D{User Reviews & Clicks Authorize}
    D -- Rejected --> E[Task Aborted / Returned to ARB]
    D -- Approved --> F[Generate Signed Approval Token]
    F --> G[Deterministic Policy Engine: Validates Budget & Merchant]
    G -- Limit Exceeded --> H[Hard Code Exception / Abort]
    G -- Passed --> I["DEFENDER: Adversarial Audit & Fraud Scoring (Phase 4)"]
    I -- Risk Flagged --> J[Escalate to Human-in-the-Loop]
    I -- Cleared --> K[PULSE: Validate Amount <= Approved Token]
    K --> L[PULSE: Call PayPal Orders API]
    L --> M[PULSE: Capture Payment & Write Audit Ledger]
    M --> N[Orchestrator: Deliver Receipt to GLY]
    N --> O[GLY: Present Receipt in Conversation]
```

### 3.2 Invalidation & Re-Approval Triggers
If any of the following parameters mutate between initial user approval and final checkout execution, the approval token is **automatically invalidated**:
1. **Landed Total Mutation:** Any increase in final price (taxes, shipping surcharges, currency drift) $> ₹0.00 / \$0.00$.
2. **Merchant Domain Divergence:** The final checkout redirect domain does not strictly match the approved merchant domain.
3. **Product Variant Shift:** SKU, color, model number, or condition changes.
4. **Token Expiration:** User approval tokens have a strict maximum TTL of 15 minutes.

---

## 4. Central Data Architecture & Entities

```mermaid
erDiagram
    USERS ||--o{ USER_PREFERENCES : has
    USERS ||--o{ CONVERSATIONS : initiates
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS ||--o{ TASKS : spawns
    TASKS ||--o{ PURCHASE_PROPOSALS : creates
    PURCHASE_PROPOSALS ||--o| USER_APPROVALS : authorized_by
    USER_APPROVALS ||--o| TRANSACTIONS : executes
    TRANSACTIONS ||--o{ AUDIT_LOGS : records

    USERS {
        uuid id PK
        string email
        timestamp created_at
    }

    USER_PREFERENCES {
        uuid user_id FK
        decimal max_single_purchase_limit
        decimal daily_spending_limit
        string preferred_currency
        string[] merchant_allowlist
        string[] merchant_blocklist
        decimal min_merchant_trust_score
    }

    TASKS {
        string task_id PK
        uuid conversation_id FK
        string assigned_pal
        string task_type
        string status
        jsonb input_requirements
        jsonb result_data
        timestamp created_at
        timestamp updated_at
    }

    PURCHASE_PROPOSALS {
        string proposal_id PK
        string task_id FK
        string merchant_name
        string merchant_url
        string product_title
        string sku
        decimal item_price
        decimal shipping_fee
        decimal total_landed_cost
        string currency
        decimal trust_score
    }

    USER_APPROVALS {
        string approval_token PK
        string proposal_id FK
        decimal approved_max_amount
        string approved_currency
        timestamp expires_at
        string signature
    }

    TRANSACTIONS {
        string transaction_id PK
        string approval_token FK
        string paypal_order_id
        string paypal_capture_id
        decimal captured_amount
        string currency
        string status
        timestamp captured_at
    }
```

---

## 5. Cross-Cutting Shared Services (`shared/`)

To preserve the **Non-Duplication Policy**, shared capabilities reside in centralized modules:

1. **`shared/llm/`**: Uniform wrapper for Google Gemini, Anthropic Claude, and OpenAI models with standardized retries, token tracking, and structured schema parsing.
2. **`shared/policy/`**: Pure deterministic evaluation engine for user spending ceilings, daily totals, currency checks, and merchant verification.
3. **`shared/db/`**: Prisma / SQLAlchemy connection pools, migrations, and shared PostgreSQL entity models.
4. **`shared/tasks/`**: Abstract Task Manager interface implemented via Redis/BullMQ or in-memory buses for testing.
5. **`shared/logging/`**: Structured JSON logger (Winston / Loguru) with automated PII masking and distributed trace context propagation.

---

## 6. Device Interaction Architecture (Phase 3 Extension)

```mermaid
flowchart LR
    ARB[ARB Engine] <--> AgentWorker[Headless Browser Controller Playwright]
    AgentWorker <--> ProxyGrid[Proxy Rotation & Captcha Avoidance]
    ProxyGrid <--> DesktopSites[Desktop Web Merchant Pages]
    
    ARB -.->|Deep Linking & Push Intents| MobileBridge[Mobile Companion Bridge]
    MobileBridge -.-> AndroidApp[Android Companion App Accessibility API]
    MobileBridge -.-> iOSApp[iOS Companion App Universal Links]
```

- **Desktop Browsing:** Sandboxed Playwright runners isolate web navigation from the host system.
- **Mobile Integration:** Employs approved OS-level deep linking and user-consented accessibility automation for merchant checkouts.
- **Safety Boundary:** The device automation runner cannot interact with banking or payment credentials directly.


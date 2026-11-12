# PALS: PayPal Autonomous Life Shopping Assistant
## End-User Manual & Operator Guide

Welcome to **PALS** (PayPal Autonomous Life Shopping). This guide walks you through setting up, launching, and using the PALS platform as an everyday shopper and system operator.

---

## 1. What is PALS?

PALS is an autonomous AI-driven commerce ecosystem that helps you research products across global marketplaces, discover the lowest authentic landed costs, evaluate security and fraud risks, and execute purchases through PayPal with full cryptographic transparency.

### The Four Cooperating PALs

1. **GLY (Conversational Intent & Router):** Your primary interactive assistant ("Pali"). Speaks with you via chat, classifies your shopping intentions, and coordinates back-office tasks.
2. **ARB (Arbitrage & Market Discovery):** Searches the web across domestic and international merchants (Amazon, Best Buy, Walmart, Flipkart, Croma, etc.), extracts prices, computes landed shipping and tax costs, and filters out counterfeit listings.
3. **DEFENDER (Security & Risk Guardian):** Evaluates merchant legitimacy, assesses merchant risk, audits transaction thresholds, and guarantees price ceiling policies before any funds are moved.
4. **PULSE (Payment Execution & Ledger):** Integrates directly with PayPal's Orders and Capture APIs, manages approval redirects, handles capture, and records tamper-proof transaction ledgers.

---

## 2. Prerequisites & Requirements

Before starting the system, ensure you have the following installed on your machine:

- **Node.js:** Version 20.x or 22+ LTS (Node 24 supported)
- **npm:** Version 10+ (bundled with Node.js)
- **Web Browser:** Any modern browser (Chrome, Edge, Firefox, Brave, Safari)
- **API Keys (for live features):**
  - **Google Gemini API Key:** (`GEMINI_API_KEY`) — Powers chat understanding and product intent classification.
  - **Search & Scraping API Key:** (`SERPER_API_KEY` or `BRIGHTDATA_API_KEY`) — Enables live product search and anti-bot unblocking. (If omitted, PALS gracefully falls back to the built-in offline test catalog).
  - **PayPal Developer Sandbox:** (`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`) — For executing sandbox checkout flows. (If omitted, research and proposal creation still work, while live payment capture is safely simulated).

---

## 3. Quick Start: Setting Up the Project

### Step 1: Configure Environment Variables

1. Locate `.env.example` in the project root directory.
2. Create a copy named `.env` in the root directory.
3. Fill in your API keys:

```env
# Gemini LLM (Required for live chat intent)
GEMINI_API_KEY=your_gemini_api_key_here
MODEL_STRUCTURED=gemini-3.5-flash
MODEL_ANSWER=gemini-3.5-flash

# Live Search & Scraping (Optional for live web shopping)
SERPER_API_KEY=your_serper_api_key_here
BRIGHTDATA_API_KEY=your_brightdata_api_key_here

# PayPal Sandbox Credentials (Optional for real sandbox checkout)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# Server Port (Default is 8787)
PALS_API_PORT=8787
```

### Step 2: One-Step Dependency Installation

Open your terminal in the project root folder and execute:

```bash
npm run setup
```

This single command installs all necessary dependencies across the orchestrator, GLY engine, and the React frontend.

### Step 3: Build the Frontend

Compile the PayPal-inspired user interface for production:

```bash
npm run frontend:build
```

---

## 4. Launching the Application

You can run PALS in **Unified Mode** (recommended) or **Development Mode**.

### Mode A: Unified Production Server (Recommended)

In your terminal, run:

```bash
npm start
```

What happens:
- The unified PALS backend boots up on `http://localhost:8787`.
- It automatically hosts the full React frontend from `frontend/dist`.
- Background agents (ARB, DEFENDER, PULSE, GLY) connect via the Central Calls bus.
- Open your browser and navigate to:
  - **Main Dashboard & UI:** `http://localhost:8787`
  - **Minimalist Stream Diagnostic Chat:** `http://localhost:8787/demo`
  - **System Health Status:** `http://localhost:8787/healthz`

### Mode B: Active Development Mode (With Hot Reloading)

If you are modifying frontend UI components or styling:

1. **Terminal 1 (Backend Orchestrator):**
   ```bash
   npm start
   ```
2. **Terminal 2 (Frontend Dev Server):**
   ```bash
   npm run frontend
   ```
   Open `http://localhost:3000` to interact with the frontend featuring instant hot-reloading connected to the live backend on port 8787.

---

## 5. User Guide: How to Use PALS

Once the application is running in your browser, here is how you interact with the system:

### 1. Natural Language Shopping Research
In the chat interface on the right side of the screen, type natural shopping inquiries:
- *"Find me a mechanical keyboard under $150"*
- *"Find noise-cancelling wireless headphones with low latency"*
- *"Find garlic naan under ₹200"*
- *"Search for a lightweight gaming mouse"*

**What PALS does:**
1. GLY classifies your intent and extracts budget, currency, and technical preferences.
2. ARB launches searches across merchant channels, verifies authentic stock, extracts prices, and filters out counterfeit offers.
3. GLY presents an interactive **Product Results Card** displaying merchant names, total landed costs, and specs.

### 2. Selecting an Item for Purchase Prep
When you see an item you like from the recommendations card, tell Pali:
- *"Get the Keychron keyboard ready"*
- *"Prepare purchase for option 1"*
- Or click the **Prepare Purchase** button directly on the product card.

**What PALS does:**
1. ARB locks in the exact seller URL and calculates landed duties and delivery fees.
2. DEFENDER evaluates merchant security metrics and signs a cryptographic authorization payload.
3. GLY presents a **Purchase Authorization Card** with a guaranteed maximum price ceiling.

### 3. One-Click PayPal Authorization
- Inspect the item summary, final price, and payment breakdown on the authorization card.
- Click **Authorize with PayPal**.
- A secure PayPal authorization window opens (or routes through the sandbox approval URL).
- Once approved, the tab updates, and PULSE captures the order, emitting a confirmed **Payment Receipt Card** complete with the receipt ID, timestamp, and settled total.

### 4. Auditing Past Transactions & Spending
You can query your payment records directly in the chat or look at the dashboard overview:
- *"Show my recent purchases"*
- *"What did I spend on electronics?"*
- *"Show my order history"*

PULSE queries its internal ledger and presents your transaction history with dates, merchant domains, currencies, and capture states.

### 5. Asking PayPal Policy & Account Questions
GLY features grounded Retrieval-Augmented Generation (RAG) using verified PayPal documentation. You can ask:
- *"How does PayPal Buyer Protection work for online purchases?"*
- *"What should I do if an item arrives damaged?"*
- *"What are the dispute time limits?"*

Pali will provide a cited, factual response sourced directly from PayPal policy docs.

---

## 6. Offline / Simulated Mode

If you do not have active API keys or want to test the full purchase loop offline:
- If `GEMINI_API_KEY` is not provided or offline, the system falls back to resilient rule-based keyword matching.
- If live web scraping is unconfigured, ARB queries a curated domestic and international catalog with sample items (keyboards, headphones, pizzas, laptops).
- If you set `VITE_PALS_SIMULATE=true` in `frontend/.env`, the frontend runs in pure mock mode with sample analytics deals and simulated instant receipts.

---

## 7. Troubleshooting & FAQ

| Problem | Cause | Solution |
|---|---|---|
| **Chat displays "AI service is temporarily unavailable"** | Invalid or missing `GEMINI_API_KEY` or transient rate limit. | Verify your key in `.env`. Ensure your model is set to `gemini-3.5-flash` or `gemini-flash-latest`. |
| **"Couldn't find matching live listings"** | Search budget exhausted or query too restrictive. | Try broader queries like `"mechanical keyboard"`, or check your `SERPER_API_KEY` balance. |
| **Port 8787 already in use** | Another service is using the default port. | Set `PALS_API_PORT=9000` in `.env` and restart `npm start`. |
| **PayPal payments refuse to execute** | `PAYPAL_CLIENT_ID` / `SECRET` not set in `.env`. | Add sandbox credentials from developer.paypal.com. In mock mode, research and offer generation still work. |
| **Frontend changes not showing up on `http://localhost:8787`** | `npm start` serves pre-built assets from `frontend/dist`. | Run `npm run frontend:build` after making changes, or run `npm run frontend` on port 3000 for development. |

---

## 8. Verification & Test Commands

To verify that all components in your local environment are functioning properly, run:

```bash
# Verify TypeScript typing across backend, GLY, and frontend
npm run typecheck

# Run GLY unit test suite (39 tests)
npm run test:gly

# Run ARB budget & scraper test suite
npx tsx --test tests/arb_scrape_budget.test.ts

# Run End-to-End multi-agent integration suite
npx tsx --test tests/pals_system.test.ts
```

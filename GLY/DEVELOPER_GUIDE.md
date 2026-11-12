# GLY (GuidePal): Developer Guide

GLY is the chat front desk of PALS. Every user message goes to GLY first, and GLY does one of three things:

1. **Answers it** when it's a question about PayPal, using official PayPal docs only (RAG).
2. **Hands it off** to ARB (shopping) or PULSE (payments) through `calls/`, tells the user "I'm on it" straight away, and keeps chatting.
3. **Shows the result** when ARB or PULSE finish, as a card in the chat. A purchase gets an Approve / Reject card.

GLY never scrapes websites, never negotiates, never touches PayPal API keys, and never makes the user wait for background work.

This guide explains every folder and file, how a message moves through the code, and where to go when you want to change something.

---

## Contents

1. [Quick start](#1-quick-start)
2. [The big picture](#2-the-big-picture)
3. [Folder structure](#3-folder-structure)
4. [How one message moves through the code](#4-how-one-message-moves-through-the-code)
5. [File-by-file guide](#5-file-by-file-guide)
6. [The data shapes](#6-the-data-shapes)
7. [Settings (environment variables)](#7-settings-environment-variables)
8. [How to make common changes](#8-how-to-make-common-changes)
9. [Tests](#9-tests)
10. [Stand-ins you will replace](#10-stand-ins-you-will-replace)
11. [Before going live](#11-before-going-live)

---

## 1. Quick start

You need **Node.js 22.18 or newer**. Node runs the TypeScript files directly, so there is no build step.

```bash
npm install
npm test
```

`npm test` runs 36 tests. They use fakes, so they need no API key and cost nothing.

To run the demo chat:

1. Get a free Gemini API key at https://aistudio.google.com/apikey
2. Copy `.env.example` to `.env` and paste your key after `GEMINI_API_KEY=`:

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

3. Start the server. Every npm script loads `.env` automatically.

```bash
npm start
```

`.env` is git-ignored, so your key never gets pushed. `.env.example` is committed and lists every
setting; never put a real key in it. The full list of what's kept out of the repo is in `.gitignore`.

3. Open http://localhost:8787

On the first start, the embedding model (~35 MB) downloads from Hugging Face, and the PayPal corpus (82 files, about 1,900 chunks) is embedded, which takes **about 4 minutes**. Both are cached, so later starts take seconds. To do the slow part ahead of time, run `npm run ingest` once.

In the demo, **ARB and PULSE are simulated**. Every product, price and receipt is made up.

| Command | What it does |
|---|---|
| `npm start` | Runs the server and demo chat page |
| `npm run dev` | Same, but restarts when you save a file |
| `npm test` | Runs all offline tests |
| `npm run typecheck` | Checks types across the project |
| `npm run fetch:paypal` | Re-downloads the PayPal corpus into `docs/knowledge/paypal/` (see section 8) |
| `npm run ingest` | Embeds `docs/knowledge/paypal/` into Postgres, or into the `.cache/` file without `DATABASE_URL` |
| `npm run eval:intent` | Measures how often the real model labels messages correctly. **Calls the real API.** |

---

## 2. The big picture

GLY is built as **7 pipelines**. A pipeline is a fixed series of steps that runs for one kind of job.

| # | Pipeline | Plain-language job | Main folder |
|---|---|---|---|
| P1 | Message In | Receive and check every message | `GLY/chat/` |
| P2 | Intent Routing | Work out what the user wants, then pick a path | `GLY/intent/` |
| P3 | Knowledge Ingest | Split PayPal docs into pieces and store them (offline) | `GLY/rag/ingest/` |
| P4 | RAG Answer | Answer PayPal questions from those pieces | `GLY/rag/` |
| P5 | Delegation | Send work to ARB / PULSE and reply at once | `GLY/delegation/` |
| P6 | Results Back | Show finished work as cards | `GLY/events/` |
| P7 | Approval | User approves a purchase, payment goes to PULSE | `GLY/events/approval.ts` |

```
User ──► P1 Message In ──► P2 Intent Routing ──┬──► P4 RAG Answer ──► streamed answer
                                               │
                                               └──► P5 Delegation ──► calls/ ──► ARB / PULSE
                                                        │                            │
                                                  "On it…" reply             (work happens)
                                                                                     │
User ◄── cards ◄── P6 Results Back ◄── task event bus (shared/tasks) ◄───────────────┘
   │
   └── taps Approve ──► P7 Approval ──► P5 ──► PULSE payment.execute
```

Two design rules shape most of the code:

- **The LLM only labels. Plain code decides.** The model fills in a form saying what the user wants. A simple lookup table in `router.ts` chooses what happens. So the model can never decide on its own to move money.
- **Sending a task and receiving its result are separate.** The Delegator sends a job and returns in milliseconds. The result arrives later as an event, and a listener picks it up. Nothing ever waits.

---

## 3. Folder structure

```
gly/
├── GLY/                          ← THE MODULE YOU OWN
│   ├── server.ts                 Entry point: wires everything and starts HTTP + WebSocket
│   ├── config.ts                 Every setting and its default, in one place
│   ├── llm.ts                    Picks Gemini or Claude from config
│   │
│   ├── chat/                     P1: messages in and out
│   │   ├── socket.ts             WebSocket server: reads and checks frames from the browser
│   │   ├── handler.ts            GlyService: the conductor that runs P1 → P2 → P4/P5, and P7
│   │   ├── session.ts            Per-chat memory: history, tasks, offers, offline inbox
│   │   └── outbound.ts           What GLY sends to the screen (messages, tokens, cards)
│   │
│   ├── intent/                   P2: understanding the message
│   │   ├── schema.ts             The form the LLM must fill in (Zod schema)
│   │   ├── prompt.ts             The instructions given to the LLM
│   │   ├── classify.ts           Calls the LLM, checks the answer, retries once
│   │   └── router.ts             Plain-code table: label → which pipeline
│   │
│   ├── rag/                      P3 + P4: PayPal knowledge
│   │   ├── deps.ts               Picks vector store + embedder from settings
│   │   ├── retrieve.ts           P4: search + "are we confident enough?"
│   │   ├── answer.ts             P4: grounded answer with citations, or "not found"
│   │   └── ingest/               P3: loading docs (offline)
│   │       ├── clean.ts          Reads the file header, removes cookie banners and so on
│   │       ├── chunk.ts          Splits docs by heading, never cuts tables or lists
│   │       ├── ingest.ts         Embeds new pieces, skips unchanged ones, removes deleted ones
│   │       └── run.ts            The `npm run ingest` command
│   │
│   ├── delegation/               P5: handing work to other PALs
│   │   ├── payloads.ts           Turns extracted details into ARB/PULSE payloads, writes ack text
│   │   ├── envelope.ts           Wraps a payload in a PalCallEnvelope ("parcel label")
│   │   └── send.ts               Delegator: sends via calls/, retries once, records the task
│   │
│   ├── events/                   P6 + P7: results and approvals
│   │   ├── listener.ts           Listens to the task bus, delivers results, sends "still working" notes
│   │   ├── cards.ts              Turns an event into a card + one-line message
│   │   └── approval.ts           Checks and sends an approved purchase to PULSE
│   │
│   ├── demo/index.html           A simple chat page for trying GLY in the browser
│   │
│   └── tests/                    All tests (see section 9)
│       ├── helpers.ts            Fakes and a ready-built GlyService for tests
│       ├── intent.test.ts        Router + classifier
│       ├── rag.test.ts           Cleaning, chunking, ingest, answers
│       ├── delegation.test.ts    Non-blocking, retries, timeouts
│       ├── results-approval.test.ts  Cards, inbox, stale tasks, payments
│       ├── boundary.test.ts      Fails if GLY imports anything it shouldn't
│       ├── eval-intent.ts        Real-model accuracy check (costs API calls)
│       ├── intent.eval.json      Labelled example messages for the eval
│       └── fixtures/corpus/      Two fake "ExamplePay" docs used by tests
│
├── shared/                       ← STAND-INS for team-owned modules
│   ├── types/index.ts            All shared data shapes (contracts)
│   ├── llm/index.ts              LlmGateway interface + Claude implementation
│   ├── llm/gemini.ts             Gemini implementation (the default)
│   ├── db/vector/index.ts        VectorStore interface, in-memory + pgvector stores, Voyage + hash embedders
│   ├── db/vector/sentence-transformer.ts  Free local Hugging Face embedder (the default)
│   ├── tasks/index.ts            TaskBus interface + in-memory bus
│   └── logging/index.ts          JSON logger
│
├── calls/index.ts                ← STAND-IN for the calls/ gateway, with fake ARB + PULSE
│
├── tools/paypal-docs/            ← OFFLINE TOOLING (not part of GLY's runtime)
│   ├── fetch.ts                  `npm run fetch:paypal`: builds the PayPal corpus from official sources
│   └── types.d.ts                Type declarations for the Markdown table plugin
│
├── docs/knowledge/paypal/        ← THE PAYPAL CORPUS GLY ANSWERS FROM
│   ├── README.md                 The required file format
│   ├── sources.json              What was fetched, from where, and when
│   ├── api-reference/            13 files: one per PayPal REST API, from the official OpenAPI specs
│   └── developer-guides/         69 files: REST basics, webhooks, sandbox, disputes, errors, Orders API
│
├── .cache/                       Saved embeddings (dev only, safe to delete; rebuilt on next start)
│
├── gly-pipelines.html            The architecture plan page
├── package.json                  Dependencies and npm scripts
└── tsconfig.json                 TypeScript settings
```

**Who owns what:** you own `GLY/`. The `shared/` and `calls/` folders hold simple versions of modules your team will build, so GLY can run on its own today. Each one sits behind an interface, so when the real version arrives, you swap one line in `server.ts` and GLY's own code doesn't change.

---

## 4. How one message moves through the code

Here's the journey of **"find me headphones under $200"**:

| Step | File | What happens |
|---|---|---|
| 1 | `chat/socket.ts` | The browser sends `{"type":"user_message","text":"..."}`. Zod checks the frame and calls `gly.handleUserMessage(...)` **without awaiting it**, so the next message can arrive at once. |
| 2 | `chat/handler.ts` → `handleUserMessage` | Checks length, opens the session, creates a `correlationId` for logs, builds an `InboundMessage` with history and recent tasks, and saves the user's turn. |
| 3 | `intent/classify.ts` | Builds the prompt (`prompt.ts`) and asks the LLM to fill in the form (`schema.ts`). Result: `{ intent: "shopping_research", confidence: 0.93, entities: { product: "headphones", budgetValue: 200, currency: "USD" } }`. |
| 4 | `intent/router.ts` → `route` | The table says shopping with a product goes to `{ kind: "delegate", target: "ARB", action: "research.start" }`. |
| 5 | `delegation/payloads.ts` → `buildPayload` | Makes an `ARBResearchPayload` and a summary: "headphones under $200". |
| 6 | `delegation/send.ts` → `Delegator.delegate` | Wraps it in an envelope (`envelope.ts`) and sends it to `calls/`. `calls/` replies "accepted" in milliseconds. The task is saved as `pending`. |
| 7 | `chat/handler.ts` | Replies "On it: looking for headphones under $200…". **The user sees this in under 1 second.** |
| … | | The user can keep chatting. ARB works in the background. |
| 8 | `shared/tasks` | ARB (fake, in `calls/index.ts`) publishes a `task.completed` event. |
| 9 | `events/listener.ts` → `handle` | Ignores duplicates, finds the session by `taskId`, marks the task `completed`. |
| 10 | `events/cards.ts` → `presentEvent` | Turns the event into "Found 3 options…" plus a `product_results` card. |
| 11 | `chat/outbound.ts` → `Delivery.deliver` | Sends it to the browser, or keeps it in the inbox if the user is offline. |

A **PayPal question** follows steps 1–4, then goes to `rag/answer.ts`. There, `retrieve.ts` searches the docs. If the best match is too weak, GLY says "not found". Otherwise the LLM writes an answer citing [1], [2], streamed word by word.

A **purchase** carries on after step 11: "get it ready" goes to ARB `purchase_prep.start`. ARB sends `proposal.ready`, and the user sees an Approve card. Tapping Approve sends `{"type":"approval",...}`, which runs `handleApproval` → `events/approval.ts` → `Delegator` → PULSE `payment.execute`. The receipt comes back through step 9.

---

## 5. File-by-file guide

### Top level of `GLY/`

**`server.ts`**: Starts everything. In order: load config → build the RAG store and embedder → load PayPal docs into memory (only when there's no Postgres) → create the task bus, the fake `calls/` and the LLM → create `GlyService` and start its listener → serve the demo page and `/healthz` → attach the WebSocket. **To connect real ARB/PULSE, change the `calls:` line here.**

**`config.ts`**: All tunable numbers in one place (`loadConfig`). Every value has a default and an environment-variable override. Tests pass overrides directly, for example `loadConfig({ staleTaskMs: 1000 })`.

**`llm.ts`**: `createLlm(config)` returns a Gemini or Claude gateway. Both the server and the eval script use it, so they always match.

### `GLY/chat/`: P1 and the conductor

**`socket.ts`**: The WebSocket server on `/chat?sessionId=…&userId=…`. It:
- rejects connections without valid IDs
- checks every incoming frame with a Zod schema (`ClientFrame`)
- flushes the offline inbox when the user connects
- fires `handleUserMessage` / `handleApproval` without waiting

⚠️ Right now `userId` comes from the URL. In production it must come from your login token.

**`handler.ts`**: `GlyService` is the heart of GLY. It owns the session store, delivery, delegator, approvals and listener.
- `handleUserMessage()` runs P1 → P2 → `act()`.
- `act()` is a `switch` over the router's decision: `clarify`, `smalltalk`, `rag`, `delegate`, `task_status`, `payment_pointer`.
- `handleApproval()` is the entry point for P7.
- Any unexpected error turns into a friendly "Something went wrong" message, never a crash.

**`session.ts`**: `SessionStore` keeps each chat's history (last 50 turns), tasks, purchase offers and offline inbox. It can find a session from a `taskId`. It's in memory, so it's lost on restart and only works on one server.

**`outbound.ts`**: Defines everything GLY can send to the screen (`OutboundEvent`, `Card`) and the `Delivery` class. Streamed tokens are sent only to open sockets. Messages and cards are kept in the inbox when the user is offline.

### `GLY/intent/`: P2

**`schema.ts`**: The **form** the LLM fills in: `intent`, `confidence`, `standaloneQuestion`, `clarifyingQuestion`, and `entities` (product, budget, currency, order ID, dates, PayPal topic, audience, region, which earlier task). Every field is required but can be `null`, which strict structured output needs. `INTENTS` lists the 8 labels.

**`prompt.ts`**: The instructions. The system part is **fixed text** (so it can be cached) with label definitions, rules and tricky examples, such as "Can I pay with PayPal on Amazon?" being a question, not a payment. The user part holds history, recent tasks, today's date and the message inside `<message>` tags, and the model is told to ignore instructions inside those tags.

**`classify.ts`**: `classifyIntent()` calls the LLM, checks the result with Zod, keeps confidence between 0 and 1, retries **once**, and falls back to `unclear` if both attempts fail.

**`router.ts`**: `route()` is the **plain-code table**:

| Label | Decision |
|---|---|
| any label with confidence < 0.6, or `unclear` | ask a clarifying question |
| `paypal_guidance` | RAG (P4) |
| `shopping_research` | ARB `research.start` (asks "what should I look for?" if no product) |
| `purchase_prep` | ARB `purchase_prep.start` (needs a product or an earlier search) |
| `transaction_query` | PULSE `transaction.query` |
| `payment_request` | **never pays**: re-shows open approval cards |
| `task_status` | lists running tasks |
| `smalltalk` | friendly fixed reply |

### `GLY/rag/`: P3 and P4

**`ingest/clean.ts`**: `parseFrontMatter()` reads the required header at the top of each doc (source, title, audience, region, topic, docDate) and rejects files without it. `cleanMarkdown()` removes images, HTML tags, cookie banners and "Skip to content" lines.

**`ingest/chunk.ts`**: `chunkMarkdown()` splits a doc by headings (keeping the path, for example "Disputes > Time limits") into pieces of about 700 tokens with a little overlap. **Tables and lists are never cut in half.** Very long paragraphs are split at sentence ends.

**`ingest/ingest.ts`**: `ingestCorpus()` reads every `.md` file and creates a stable ID and a content hash for each chunk:
- unchanged chunks are skipped
- new or changed chunks are embedded in batches and saved
- chunks that no longer exist are deleted, but **only if every file parsed**, so one broken file can't wipe good data

**`ingest/run.ts`**: The `npm run ingest` command. It prints a summary.

**`deps.ts`**: `createRagDeps()` picks the embedder (`GLY_EMBEDDER`) and the store (Postgres if `DATABASE_URL` is set, otherwise memory).

**`retrieve.ts`**: `retrieve()` embeds the question and searches. If filters returned nothing, it tries once without them. It gives a small ranking boost to the detected topic, then decides **confident = best score ≥ threshold**, keeping up to 5 close matches.

**`answer.ts`**: `answerPaypalQuestion()`:
- if not confident, it sends the "couldn't find that in PayPal's official docs" message with a PayPal Help link, **without calling the LLM**
- otherwise it sends numbered sources plus strict rules (only use these sources, cite every fact, mention region differences, no advice), streams tokens, then sends the sources actually cited
- if the model refuses or fails, it sends a polite fallback

### `GLY/delegation/`: P5

**`payloads.ts`**: `buildPayload()` turns extracted details into the exact payload each PAL expects. For `purchase_prep` it links to the task the user pointed at, or the latest search. `ackText()` holds the "On it…" wording for each action.

**`envelope.ts`**: `makeEnvelope()` builds the `PalCallEnvelope`: `taskId`, `correlationId`, `sessionId`, `from: "GLY"`, `to` (looked up from the action in `TARGET`), `action`, `idempotencyKey`, `payload`, `sentAt`.

**`send.ts`**: `Delegator.delegate()`:
- sends through `calls/` with a **3-second timeout for the "accepted" reply** (not for the work itself)
- retries **once with the same envelope and key**, so a duplicate can't start two jobs
- doesn't retry an explicit "rejected"
- on success saves the task as `pending` and returns, which takes milliseconds

### `GLY/events/`: P6 and P7

**`listener.ts`**: `ResultListener`:
- subscribes to the task bus
- ignores duplicate events (remembers the last 10,000 event IDs) and events for unknown or already-finished tasks
- updates task status, registers purchase offers, and delivers the message and card
- `sweepStale()` runs on a timer and sends **one** "still working on it" note for a task that's been quiet too long

**`cards.ts`**: `presentEvent()` maps each event type to a one-line message and a card: `product_results`, `approval`, `payment_receipt`, `transactions` or `error`.

**`approval.ts`**: `ApprovalService.decide()` is **the only road to a payment**. In order, it checks that the offer exists, that it belongs to this user, that it isn't already approved or rejected, and that it hasn't expired. Then it marks the offer approved *before* sending (so a double tap can't pay twice) and sends `payment.execute` with idempotency key `pay:<proposalId>`. If sending fails, the offer goes back to `open` and the user is told nothing was charged.

### `GLY/demo/index.html`

A plain chat page. It connects to the WebSocket, shows streamed answers with sources, and draws each card type, including working Approve / Reject buttons. It's for development only.

### `shared/`: stand-ins for team modules

**`types/index.ts`**: Every contract between PALs (see section 6).

**`llm/index.ts`**: The `LlmGateway` interface, which has only two methods:
- `structured(prompt, schema)` returns an object matching the schema, or `null`
- `streamText(prompt, onText)` streams text, or returns `null` on refusal

It also holds `AnthropicLlm` (Claude) as an alternative.

**`llm/gemini.ts`**: `GeminiLlm`, the default. `structured()` asks for JSON output that follows the Zod schema (converted with `z.toJSONSchema`) with **minimal thinking** for speed. `streamText()` streams the answer. Both return `null` if Gemini blocks the reply for safety reasons.

**`db/vector/index.ts`**: The `VectorStore` and `Embedder` interfaces, plus:
- `InMemoryVectorStore`: cosine search in memory (dev and tests)
- `PgVectorStore`: creates the `gly_paypal_chunks` table with an HNSW index on first use
- `VoyageEmbedder`: paid API option
- `LocalHashEmbedder`: word-matching only, **for tests**

**`db/vector/sentence-transformer.ts`**: `SentenceTransformerEmbedder`, the default. It runs **BAAI/bge-small-en-v1.5** locally through Transformers.js: free, MIT licence, 384 numbers per text. It adds BGE's search prefix to queries only, and its suggested threshold is 0.6.

**`tasks/index.ts`**: The `TaskBus` interface and an in-memory version built on Node's EventEmitter.

**`logging/index.ts`**: Writes one JSON line per log entry. `child()` adds fields such as `correlationId` to every line after it. Set `LOG_LEVEL=silent` to mute it.

### `calls/index.ts`

The `CallsGateway` interface (one method, `send(envelope)`, which must resolve once the job is **accepted**) and `FakeCalls`, which pretends to be ARB and PULSE: it accepts instantly, waits a few seconds, then publishes made-up results. It honours idempotency keys and can simulate failures (`failNext`) for tests.

---

## 6. The data shapes

All of these are in `shared/types/index.ts`.

| Type | Who makes it | Purpose |
|---|---|---|
| `InboundMessage` | P1 | One user message plus history and recent tasks |
| `IntentResult` | P2 (`intent/schema.ts`) | The filled-in form from the LLM |
| `PalCallEnvelope<T>` | P5 | The parcel label for every call to another PAL |
| `ARBResearchPayload` | P5 → ARB | "Find products like this" |
| `PurchasePrepRequest` | P5 → ARB | "Get this item ready and find coupons" |
| `TransactionQueryRequest` | P5 → PULSE | "Look up history / balance / refund / order" |
| `PulsePaymentRequest` | P7 → PULSE | "Pay this approved offer" |
| `CallAck` | calls/ → P5 | "Accepted" or "rejected" |
| `TaskEvent` | ARB/PULSE → P6 | `task.progress`, `task.completed`, `task.failed`, `proposal.ready` |
| `PurchaseProposal` | ARB → P6/P7 | The offer shown on the approval card |
| `TaskRef` | P5 | GLY's own record of a task and its status |

⚠️ These names are **GLY's proposal**. Agree them with the ARB and PULSE owners. One known mismatch: the contract lists `PurchaseProposal` as what GLY sends for `purchase_prep.start`, but a proposal is what ARB *returns*, so GLY sends `PurchasePrepRequest`.

---

## 7. Settings (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `GEMINI_API_KEY` | – | Gemini key (required with the default provider) |
| `GLY_LLM_PROVIDER` | `gemini` | `gemini` or `anthropic` (then set `ANTHROPIC_API_KEY`) |
| `GLY_INTENT_MODEL` | `gemini-3.5-flash` | Model that labels messages |
| `GLY_ANSWER_MODEL` | `gemini-3.5-flash` | Model that writes PayPal answers |
| `GLY_EMBEDDER` | `sentence-transformer` | `sentence-transformer` (free, local), `voyage`, or `hash` (tests only) |
| `GLY_EMBEDDING_MODEL` | `Xenova/bge-small-en-v1.5` | Any Hugging Face model with ONNX weights |
| `VOYAGE_API_KEY` | – | Only for `GLY_EMBEDDER=voyage` |
| `DATABASE_URL` | – | Postgres with pgvector. Without it, docs are kept in memory and reloaded at every start |
| `GLY_RAG_SCORE_MIN` | per embedder (0.6 for BGE) | Match score needed before GLY answers |
| `GLY_RAG_TOP_K` | `8` | How many doc pieces to search |
| `GLY_INTENT_CONFIDENCE_MIN` | `0.6` | Below this, GLY asks a clarifying question |
| `GLY_HISTORY_TURNS` | `10` | Past turns sent to the classifier |
| `GLY_CALL_ACK_TIMEOUT_MS` | `3000` | How long to wait for calls/ to *accept* a job |
| `GLY_STALE_TASK_MS` | `300000` | Quiet time before the "still working" note (5 min) |
| `GLY_FAKE_WORK_MS` | `4000` | How long fake ARB/PULSE take (demo only) |
| `GLY_PORT` | `8787` | Server port |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent` |

---

## 8. How to make common changes

### The PayPal corpus: what's in it and how to change it

`npm run fetch:paypal` (`tools/paypal-docs/fetch.ts`) builds the corpus from two official sources:

| Source | What it becomes | Licence / rules |
|---|---|---|
| [PayPal REST API specs](https://github.com/paypal/paypal-rest-api-specifications) (13 OpenAPI files) | `api-reference/*.md`: every operation, its parameters and responses, and every schema field with its description | Apache-2.0 |
| [developer.paypal.com](https://developer.paypal.com/) pages from its sitemap | `developer-guides/*.md`: page text converted to Markdown, with links, images, cookie notices and buttons removed | Pages blocked by robots.txt are skipped; 0.6 s pause between pages |

The guide pages come from the sections in the `INCLUDE` list at the top of `fetch.ts` (`/api/rest/`, `/api/disputes`, `/disputes/`, `/platforms/disputes/`, `/sandbox-testing/`), plus the pages in `SEEDS`. Re-running the fetcher replaces those two folders.

- **Add a section:** add its path prefix to `INCLUDE` (the sitemap has about 4,800 pages, mostly Braintree and deprecated APIs, so stay selective), run `npm run fetch:paypal`, then restart.
- **Add your own pages:** put Markdown files with the header from `docs/knowledge/paypal/README.md` in a **new** subfolder, such as `consumer/`, so the fetcher won't overwrite them.
- **Refresh:** run `npm run fetch:paypal` again. Only changed chunks are re-embedded.
- Options: `--specs-only`, `--guides-only`, `--max-pages=N`, `--delay-ms=N`.

**What the corpus does not cover yet:** consumer topics such as personal fees, buyer protection and account limits. Those live on paypal.com help pages, not developer.paypal.com. Until you add them, questions like "how much does it cost to send money to a friend?" have no real source. Retrieval may still find a weak match (an API schema about amounts scored 0.72), so the answer prompt's "say not found if the sources don't answer it" rule is what stops a wrong answer. Test this with your Gemini key.

**Tuning:** in tests on this corpus, real developer questions scored 0.75–0.87 against the right page, and an unrelated question scored 0.57. The default cut-off is 0.6. If wrong pages get through, raise `GLY_RAG_SCORE_MIN`. If good answers say "not found", lower it.

### Change the model
Set `GLY_INTENT_MODEL` / `GLY_ANSWER_MODEL`. To switch to Claude, set `GLY_LLM_PROVIDER=anthropic`. To add another provider, write a class with `structured()` and `streamText()` in `shared/llm/` and add a branch in `GLY/llm.ts`.

### Change the wording of replies
- "On it…" acknowledgements: `ackText()` in `delegation/payloads.ts`
- Result messages: `presentEvent()` in `events/cards.ts`
- "Not found" text: `notFoundText()` in `rag/answer.ts`
- Clarifying, smalltalk and task-status replies: `router.ts` and `handler.ts`

### Add a new intent (for example "cancel_order")
1. `intent/schema.ts`: add it to `INTENTS`, and add any new entity fields.
2. `intent/prompt.ts`: define it and add one or two tricky examples.
3. `intent/router.ts`: add a `case` that returns a decision. Add a new decision kind if needed.
4. `chat/handler.ts`: handle the new decision kind in `act()`.
5. If it goes to another PAL: add the action to `PalAction` in `shared/types`, its target in `TARGET` (`envelope.ts`), a payload in `buildPayload()` and wording in `ackText()`.
6. Add test cases to `intent.test.ts` and rows to `intent.eval.json`.

### Add a new card type
1. Add it to the `Card` type in `chat/outbound.ts`.
2. Produce it in `presentEvent()` in `events/cards.ts`.
3. Draw it in `card()` in `demo/index.html` (and in your real frontend).

### Connect the real calls/ gateway
Write a class that implements `CallsGateway` (one method, `send`, that resolves once the job is accepted) and use it in place of `FakeCalls` on the `calls:` line in `server.ts`.

### Connect the real task bus
Implement `TaskBus` (`publish`, `subscribe`) on Redis, NATS or whatever your team uses, and pass it in `server.ts`. The listener already ignores duplicate events.

### Use Postgres + pgvector
Set `DATABASE_URL`. The table and index are created automatically, then run `npm run ingest`. If you change the embedding model later, empty the table and re-ingest, because the vector size has to match.

### Tune routing
- Too many clarifying questions: lower `GLY_INTENT_CONFIDENCE_MIN`, or add examples to `prompt.ts`.
- Wrong labels: add the failing message as an example in `prompt.ts` and a row in `intent.eval.json`, then run `npm run eval:intent`.

---

## 9. Tests

```bash
npm test
```

| File | What it proves |
|---|---|
| `intent.test.ts` | Every label routes correctly. Low confidence asks a question. Payment requests never reach PULSE. The classifier retries once and falls back to `unclear`. The system prompt contains nothing from the user's message. |
| `rag.test.ts` | Header parsing and rejection, cleaning, heading paths, lists and tables kept whole, long-text splitting, unchanged chunks skipped, no pruning when a file is broken, cited answers, "not found" without calling the LLM, refusal fallback. |
| `delegation.test.ts` | **Reply in under 1 s while ARB takes 30 s**, chatting continues, one retry with the same key, a clear error when calls/ is down, a timeout when calls/ hangs, transactions go to PULSE. |
| `results-approval.test.ts` | Product cards, duplicate events ignored, offline inbox delivered on reconnect, a single "still working" note, full offer → approve → receipt flow, **double tap pays once**, expired offers refused, another user blocked, "pay for it" in chat never pays. |
| `boundary.test.ts` | GLY imports only its own files, `calls/`, the allowed `shared/` modules, `zod` and `ws`. No scraping libraries, no PayPal SDKs, no PayPal secrets. |

`helpers.ts` provides `FakeLlm` (no network), `keywordClassifier` (simple rules in place of the LLM), `makeGly()` (a fully wired GlyService) and `connect()` (a fake browser that records everything it receives).

**Real-model check:** `npm run eval:intent` sends the 32 messages in `intent.eval.json` to the real model and reports accuracy. It fails below 95%. It costs a few API calls each run. Grow the file to about 200 rows over time.

---

## 10. Stand-ins you will replace

| Folder | Stand-in now | Replace with |
|---|---|---|
| `calls/` | `FakeCalls` (simulated ARB + PULSE) | The real calls/ gateway |
| `shared/tasks/` | `InMemoryTaskBus` | The team's bus (Redis, NATS, …) |
| `shared/llm/` | `GeminiLlm` / `AnthropicLlm` | Keep, or the team's LLM gateway |
| `shared/db/vector/` | In-memory store + `PgVectorStore` | Keep `PgVectorStore` |
| `shared/types/` | Proposed contracts | API_CONTRACTS.md once agreed |
| `shared/logging/` | JSON-to-console logger | The team's logger |
| `GLY/chat/session.ts` | In-memory sessions | Redis or Postgres, once GLY runs on more than one server |

---

## 11. Before going live

- [ ] Add consumer PayPal help pages (fees, buyer protection, limits) to the corpus. Today it only covers developer docs.
- [ ] Check PayPal's site terms before using fetched developer pages in production. The OpenAPI specs are Apache-2.0.
- [ ] Take `userId` from your login token, not the WebSocket URL (`chat/socket.ts`).
- [ ] Agree the contract names in `shared/types/` with the ARB and PULSE owners.
- [ ] Decide with the team whether refunds need an approval card. Right now GLY refuses to start refunds from chat.
- [ ] Run `npm run eval:intent` and grow the eval set.
- [ ] Tune `GLY_RAG_SCORE_MIN` on real questions.
- [ ] Move sessions to shared storage before running more than one GLY server.
- [ ] Replace the demo page with your real frontend (the message formats are in `chat/socket.ts` and `chat/outbound.ts`).

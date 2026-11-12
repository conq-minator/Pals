import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InboundMessage } from "../../shared/types/index.ts";
import { classifyIntent } from "../intent/classify.ts";
import { buildIntentPrompt } from "../intent/prompt.ts";
import { route } from "../intent/router.ts";
import { FakeLlm, intent, log } from "./helpers.ts";

const ctx = { text: "msg", recentTasks: [], confidenceMin: 0.6 };

describe("P2 router (plain-code table)", () => {
  it("sends PayPal questions to RAG with the standalone question", () => {
    const d = route(intent({ intent: "paypal_guidance", standaloneQuestion: "What are the fees for sellers?", entities: { audience: "merchant", region: "us" } }), ctx);
    assert.deepEqual(d, { kind: "rag", question: "What are the fees for sellers?", filter: { audience: "merchant", region: "US" } });
  });

  it("sends shopping to ARB research.start", () => {
    assert.deepEqual(route(intent({ intent: "shopping_research", entities: { product: "mouse" } }), ctx), { kind: "delegate", target: "ARB", action: "research.start" });
  });

  it("asks for the product when shopping has none", () => {
    assert.equal(route(intent({ intent: "shopping_research" }), ctx).kind, "clarify");
  });

  it("sends purchase prep to ARB only when there is something to prepare", () => {
    assert.equal(route(intent({ intent: "purchase_prep" }), ctx).kind, "clarify");
    const withTask = { ...ctx, recentTasks: [{ taskId: "t1", target: "ARB" as const, action: "research.start" as const, status: "completed" as const, summary: "mouse", createdAt: "", updatedAt: "" }] };
    assert.deepEqual(route(intent({ intent: "purchase_prep" }), withTask), { kind: "delegate", target: "ARB", action: "purchase_prep.start" });
  });

  it("sends transaction questions to PULSE transaction.query", () => {
    assert.deepEqual(route(intent({ intent: "transaction_query" }), ctx), { kind: "delegate", target: "PULSE", action: "transaction.query" });
  });

  it("never routes a payment request to PULSE", () => {
    assert.deepEqual(route(intent({ intent: "payment_request" }), ctx), { kind: "payment_pointer" });
  });

  it("asks a question when confidence is low, using the model's question if given", () => {
    const d = route(intent({ intent: "shopping_research", confidence: 0.4, clarifyingQuestion: "Search, or a PayPal question?", entities: { product: "x" } }), ctx);
    assert.deepEqual(d, { kind: "clarify", question: "Search, or a PayPal question?" });
  });

  it("handles task status, smalltalk and unclear", () => {
    assert.equal(route(intent({ intent: "task_status" }), ctx).kind, "task_status");
    assert.equal(route(intent({ intent: "smalltalk" }), ctx).kind, "smalltalk");
    assert.equal(route(intent({ intent: "unclear" }), ctx).kind, "clarify");
  });
});

const msg = (text: string): InboundMessage => ({
  messageId: "m1", sessionId: "s1", userId: "u1", text, receivedAt: "2026-11-11T10:00:00Z", correlationId: "c1",
  history: [{ role: "user", text: "find me a mouse", at: "" }],
  recentTasks: [{ taskId: "task_1", target: "ARB", action: "research.start", status: "pending", summary: "mouse", createdAt: "", updatedAt: "" }],
});

describe("P2 classifier", () => {
  it("returns a validated result and clamps confidence", async () => {
    const llm = new FakeLlm(() => intent({ intent: "smalltalk", confidence: 7 }));
    const r = await classifyIntent(llm, msg("thanks"), log);
    assert.equal(r.intent, "smalltalk");
    assert.equal(r.confidence, 1);
  });

  it("retries once on invalid output, then succeeds", async () => {
    let n = 0;
    const llm = new FakeLlm(() => (n++ === 0 ? { intent: "dance" } : intent({ intent: "smalltalk" })));
    const r = await classifyIntent(llm, msg("hi"), log);
    assert.equal(r.intent, "smalltalk");
    assert.equal(llm.structuredCalls.length, 2);
  });

  it("falls back to unclear after two failures or errors", async () => {
    const llm = new FakeLlm(() => { throw new Error("boom"); });
    const r = await classifyIntent(llm, msg("hi"), log);
    assert.equal(r.intent, "unclear");
    assert.equal(r.confidence, 0);
    assert.equal(r.llmUnavailable, true, "both calls threw, so the LLM is marked unavailable");
    assert.equal(llm.structuredCalls.length, 2);
  });

  it("does not mark the LLM unavailable when it answered but the answer was invalid", async () => {
    const llm = new FakeLlm(() => ({ intent: "dance" }));
    const r = await classifyIntent(llm, msg("hi"), log);
    assert.equal(r.intent, "unclear");
    assert.equal(r.llmUnavailable, undefined);
  });

  it("puts history, open tasks and the fenced message in the prompt", () => {
    const p = buildIntentPrompt(msg("get the second one ready"));
    assert.match(p.user, /User: find me a mouse/);
    assert.match(p.user, /taskId=task_1 ARB research.start "mouse"/);
    assert.match(p.user, /<message>\nget the second one ready\n<\/message>/);
    assert.ok(!p.system.includes("get the second one ready"), "system prompt stays static for caching");
  });
});

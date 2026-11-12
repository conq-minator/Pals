// Test doubles and a ready-wired GlyService. Nothing here calls a real API.

import { FakeCalls, type FakeCallsOptions } from "../../calls/index.ts";
import { InMemoryVectorStore, LocalHashEmbedder } from "../../shared/db/vector/index.ts";
import type { LlmGateway, LlmPrompt } from "../../shared/llm/index.ts";
import { createLogger } from "../../shared/logging/index.ts";
import { InMemoryTaskBus } from "../../shared/tasks/index.ts";
import { GlyService } from "../chat/handler.ts";
import type { OutboundEvent } from "../chat/outbound.ts";
import { loadConfig, type GlyConfig } from "../config.ts";
import { UNCLEAR_RESULT, type IntentResult } from "../intent/schema.ts";

process.env.LOG_LEVEL ??= "silent";

export const log = createLogger("test");

export function intent(over: Partial<Omit<IntentResult, "entities">> & { entities?: Partial<IntentResult["entities"]> }): IntentResult {
  return {
    ...UNCLEAR_RESULT,
    confidence: 0.95,
    ...over,
    entities: { ...UNCLEAR_RESULT.entities, ...(over.entities ?? {}) },
  };
}

export class FakeLlm implements LlmGateway {
  structuredCalls: LlmPrompt[] = [];
  streamCalls: LlmPrompt[] = [];
  classifyFn: (text: string) => unknown;
  answer: string | null;

  constructor(classifyFn: (text: string) => unknown, answer: string | null = "PayPal-style answer [1].") {
    this.classifyFn = classifyFn;
    this.answer = answer;
  }

  async structured(prompt: LlmPrompt): Promise<any> {
    this.structuredCalls.push(prompt);
    const m = prompt.user.match(/<message>\n([\s\S]*)\n<\/message>/);
    return this.classifyFn(m?.[1] ?? "");
  }

  async streamText(prompt: LlmPrompt, onText: (d: string) => void): Promise<string | null> {
    this.streamCalls.push(prompt);
    if (this.answer === null) return null;
    for (const piece of this.answer.match(/.{1,8}/g) ?? []) onText(piece);
    return this.answer;
  }
}

/** Default classifier for service tests: keyword rules standing in for the LLM. */
export function keywordClassifier(text: string): IntentResult {
  const t = text.toLowerCase();
  if (t.startsWith("find")) {
    const budget = t.match(/\$(\d+)/);
    return intent({ intent: "shopping_research", entities: { product: t.replace(/^find (me )?/, "").replace(/ under.*$/, ""), budgetValue: budget ? Number(budget[1]) : null, currency: budget ? "USD" : null } });
  }
  if (t.includes("get it ready") || t.includes("coupon")) return intent({ intent: "purchase_prep" });
  if (t.includes("pay for it") || t.includes("buy it")) return intent({ intent: "payment_request" });
  if (t.includes("spend") || t.includes("transactions")) return intent({ intent: "transaction_query", entities: { transactionKind: "history" } });
  if (t.includes("done yet")) return intent({ intent: "task_status" });
  if (t.includes("thanks")) return intent({ intent: "smalltalk" });
  if (t.endsWith("?")) return intent({ intent: "paypal_guidance", standaloneQuestion: text });
  return intent({ intent: "unclear", confidence: 0.2 });
}

export function makeGly(opts: { llm?: FakeLlm; calls?: FakeCallsOptions; config?: Partial<GlyConfig>; now?: () => number } = {}) {
  const bus = new InMemoryTaskBus();
  const calls = new FakeCalls(bus, { workMs: 20, ...opts.calls });
  const llm = opts.llm ?? new FakeLlm(keywordClassifier);
  const rag = { store: new InMemoryVectorStore(), embedder: new LocalHashEmbedder() };
  const config = loadConfig({ callAckTimeoutMs: 200, staleTaskMs: 60_000, ...opts.config });
  const gly = new GlyService({ config, llm, rag, calls, bus, log, now: opts.now });
  gly.start();
  return { gly, bus, calls, llm, rag, config };
}

/** Connects a fake socket and records everything sent to it. */
export function connect(gly: GlyService, sessionId = "s1", userId = "u1") {
  gly.sessions.open(sessionId, userId);
  const events: OutboundEvent[] = [];
  const send = (e: OutboundEvent) => events.push(e);
  gly.delivery.connect(sessionId, send);
  return { sessionId, userId, events, send, messages: () => events.filter((e) => e.type === "message").map((e) => (e as { text: string }).text) };
}

export async function waitFor(cond: () => boolean, ms = 2000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting for condition");
    await new Promise((r) => setTimeout(r, 5));
  }
}

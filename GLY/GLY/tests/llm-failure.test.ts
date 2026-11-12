// When the LLM is down (bad key, no network, quota), the user must be told so,
// not asked to rephrase a perfectly clear message.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geminiSchema } from "../../shared/llm/gemini.ts";
import { LLM_DOWN, LLM_DOWN_PASSAGE } from "../chat/handler.ts";
import { IntentResultSchema } from "../intent/schema.ts";
import { connect, FakeLlm, makeGly } from "./helpers.ts";

describe("LLM failures", () => {
  it("tells the user the AI service is unavailable instead of 'didn't get that'", async () => {
    const llm = new FakeLlm(() => {
      throw new Error("API key not valid");
    });
    const { gly, calls } = makeGly({ llm });
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me headphones" });

    const errors = c.events.filter((e) => e.type === "error").map((e) => (e as { text: string }).text);
    assert.deepEqual(errors, [LLM_DOWN]);
    assert.equal(c.messages().length, 0, "no misleading clarifying question");
    assert.equal(calls.sent.length, 0, "nothing was delegated");
    gly.stop();
  });

  it("still answers a question from the knowledge base when the LLM is down", async () => {
    const llm = new FakeLlm(() => {
      throw new Error("quota exceeded");
    });
    const { gly, rag } = makeGly({ llm, config: { ragScoreMin: 0.1 } });
    const text = "PayPal basics > Refunds\n\nRefunds come from the seller. Ask the seller first; the money goes back to how you paid.";
    const [embedding] = await rag.embedder.embed([text]);
    await rag.store.upsert([{ id: "c1", hash: "h1", text, embedding: embedding!, meta: { sourceUrl: "https://example.test/refunds", title: "PayPal basics", section: "Refunds", audience: "consumer", region: "global", topic: "refunds", docDate: "2026-11-12", corpusVersion: "t" } as any }]);
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "How do refunds work?" });

    const tokens = c.events.filter((e) => e.type === "token").map((e) => (e as { text: string }).text).join("");
    assert.ok(tokens.startsWith(LLM_DOWN_PASSAGE), "explains the AI is busy");
    assert.match(tokens, /Refunds come from the seller/);
    assert.equal(c.events.filter((e) => e.type === "error").length, 0, "no error shown");
    gly.stop();
  });

  it("sends Gemini a schema without the $schema line, with every field required", () => {
    const s = geminiSchema(IntentResultSchema) as { $schema?: string; required?: string[]; properties?: Record<string, unknown> };
    assert.equal(s.$schema, undefined);
    assert.deepEqual([...(s.required ?? [])].sort(), Object.keys(s.properties ?? {}).sort());
  });
});

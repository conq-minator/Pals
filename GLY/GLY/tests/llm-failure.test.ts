// When the LLM is down (bad key, no network, quota), the user must be told so,
// not asked to rephrase a perfectly clear message.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geminiSchema } from "../../shared/llm/gemini.ts";
import { LLM_DOWN } from "../chat/handler.ts";
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

  it("sends Gemini a schema without the $schema line, with every field required", () => {
    const s = geminiSchema(IntentResultSchema) as { $schema?: string; required?: string[]; properties?: Record<string, unknown> };
    assert.equal(s.$schema, undefined);
    assert.deepEqual([...(s.required ?? [])].sort(), Object.keys(s.properties ?? {}).sort());
  });
});

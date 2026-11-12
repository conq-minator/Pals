import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ARBResearchPayload } from "../../shared/types/index.ts";
import { connect, makeGly } from "./helpers.ts";

describe("P5 delegation", () => {
  it("acknowledges in under a second while ARB takes 30 s, and keeps chatting", async () => {
    const { gly, calls } = makeGly({ calls: { workMs: 30_000 } });
    const c = connect(gly);

    const t0 = performance.now();
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me headphones under $200" });
    const ackMs = performance.now() - t0;

    assert.ok(ackMs < 1000, `ack took ${ackMs} ms`);
    assert.match(c.messages()[0]!, /On it: looking for headphones under \$200/);

    // Second message is answered while the first task is still running.
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "thanks" });
    assert.equal(c.messages().length, 2);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "is it done yet" });
    assert.match(c.messages()[2]!, /Still working on:\n• headphones under \$200/);

    const env = calls.sent[0]!;
    assert.equal(env.to, "ARB");
    assert.equal(env.action, "research.start");
    assert.equal(env.from, "GLY");
    assert.deepEqual((env.payload as ARBResearchPayload).maxPrice, { value: 200, currency: "USD" });
    gly.stop();
  });

  it("retries once with the same envelope and idempotency key", async () => {
    const { gly, calls } = makeGly({ calls: { failNext: 1 } });
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    assert.equal(calls.sent.length, 1);
    assert.match(c.messages()[0]!, /On it/);
    gly.stop();
  });

  it("tells the user plainly when calls/ is down, and stops after one retry", async () => {
    const { gly, calls } = makeGly({ calls: { failNext: 5 } });
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    assert.equal(calls.failNext, 3, "exactly two attempts were made");
    assert.match(c.messages()[0]!, /couldn't start that right now/);
    assert.equal(gly.sessions.peek(c.sessionId)!.tasks.size, 0, "no task recorded");
    gly.stop();
  });

  it("times out a hanging calls/ instead of blocking the chat", async () => {
    const { gly, calls } = makeGly({ config: { callAckTimeoutMs: 50 } });
    calls.send = () => new Promise(() => {}); // never answers
    const c = connect(gly);
    const t0 = performance.now();
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    assert.ok(performance.now() - t0 < 1000);
    assert.match(c.messages()[0]!, /couldn't start that right now/);
    gly.stop();
  });

  it("routes transaction questions to PULSE", async () => {
    const { gly, calls } = makeGly();
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "what did I spend last month" });
    assert.equal(calls.sent[0]!.to, "PULSE");
    assert.equal(calls.sent[0]!.action, "transaction.query");
    gly.stop();
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Card } from "../chat/outbound.ts";
import { connect, makeGly, waitFor } from "./helpers.ts";

const cards = (events: { type: string }[]) => events.filter((e) => e.type === "card").map((e) => (e as unknown as { card: Card }).card);

describe("P6 results back", () => {
  it("shows a product card when ARB finishes", async () => {
    const { gly } = makeGly();
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    await waitFor(() => cards(c.events).length === 1);
    const card = cards(c.events)[0]!;
    assert.equal(card.kind, "product_results");
    const task = [...gly.sessions.peek(c.sessionId)!.tasks.values()][0]!;
    assert.equal(task.status, "completed");
    gly.stop();
  });

  it("ignores duplicate and unknown events", async () => {
    const { gly } = makeGly();
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    const task = [...gly.sessions.peek(c.sessionId)!.tasks.values()][0]!;
    const ev = { eventId: "e1", taskId: task.taskId, at: new Date().toISOString(), type: "task.failed" as const, data: { reason: "x" } };
    gly.listener.handle(ev);
    gly.listener.handle(ev);
    gly.listener.handle({ ...ev, eventId: "e2", taskId: "nope" });
    assert.equal(cards(c.events).length, 1);
    gly.stop();
  });

  it("keeps results in an inbox while the user is offline, then delivers on reconnect", async () => {
    const { gly } = makeGly();
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    gly.delivery.disconnect(c.sessionId, c.send);
    await waitFor(() => gly.sessions.peek(c.sessionId)!.inbox.length === 2);

    const later: { type: string }[] = [];
    gly.delivery.connect(c.sessionId, (e) => later.push(e));
    assert.equal(cards(later).length, 1);
    assert.equal(gly.sessions.peek(c.sessionId)!.inbox.length, 0);
    gly.stop();
  });

  it("sends one 'still working' note for a stale task", async () => {
    let now = Date.now();
    const { gly } = makeGly({ calls: { workMs: 60_000 }, config: { staleTaskMs: 1000 }, now: () => now });
    const c = connect(gly);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    now += 5000;
    gly.listener.sweepStale();
    gly.listener.sweepStale();
    assert.equal(c.messages().filter((m) => m.startsWith("Still working")).length, 1);
    gly.stop();
  });
});

describe("P7 approval", () => {
  async function toProposal(over: Parameters<typeof makeGly>[0] = {}) {
    const t = makeGly(over);
    const c = connect(t.gly);
    await t.gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "find me a mouse" });
    await waitFor(() => cards(c.events).length === 1);
    await t.gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "get it ready with a coupon" });
    await waitFor(() => cards(c.events).some((x) => x.kind === "approval"));
    const approval = cards(c.events).find((x) => x.kind === "approval") as Extract<Card, { kind: "approval" }>;
    return { ...t, c, approval };
  }

  it("goes from offer to payment to receipt", async () => {
    const { gly, calls, c, approval } = await toProposal();
    await gly.handleApproval({ sessionId: c.sessionId, userId: c.userId, proposalId: approval.proposalId, decision: "approve" });
    await waitFor(() => cards(c.events).some((x) => x.kind === "payment_receipt"));
    const pay = calls.sent.filter((e) => e.action === "payment.execute");
    assert.equal(pay.length, 1);
    assert.equal(pay[0]!.to, "PULSE");
    assert.equal(pay[0]!.idempotencyKey, `pay:${approval.proposalId}`);
    gly.stop();
  });

  it("a double tap sends only one payment request", async () => {
    const { gly, calls, c, approval } = await toProposal();
    const args = { sessionId: c.sessionId, userId: c.userId, proposalId: approval.proposalId, decision: "approve" as const };
    await Promise.all([gly.handleApproval(args), gly.handleApproval(args)]);
    assert.equal(calls.sent.filter((e) => e.action === "payment.execute").length, 1);
    gly.stop();
  });

  it("refuses expired offers and rejected offers", async () => {
    let now = Date.now();
    const { gly, calls, c, approval } = await toProposal({ now: () => now });
    now += 60 * 60_000;
    await gly.handleApproval({ sessionId: c.sessionId, userId: c.userId, proposalId: approval.proposalId, decision: "approve" });
    assert.ok(c.events.some((e) => e.type === "error" && /expired/.test((e as { text: string }).text)));
    assert.equal(calls.sent.filter((e) => e.action === "payment.execute").length, 0);
    gly.stop();
  });

  it("blocks approval from another user", async () => {
    const { gly, calls, c, approval } = await toProposal();
    await gly.handleApproval({ sessionId: c.sessionId, userId: "intruder", proposalId: approval.proposalId, decision: "approve" });
    assert.equal(calls.sent.filter((e) => e.action === "payment.execute").length, 0);
    gly.stop();
  });

  it("'pay for it' in chat never pays; it re-shows the card", async () => {
    const { gly, calls, c } = await toProposal();
    const before = cards(c.events).length;
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "pay for it" });
    assert.equal(calls.sent.filter((e) => e.action === "payment.execute").length, 0);
    assert.equal(cards(c.events).length, before + 1);
    assert.match(c.messages().at(-1)!, /tap Approve/);
    gly.stop();
  });
});

// calls/: the single gateway for inter-PAL traffic.
// GLY depends only on the CallsGateway interface. FakeCalls stands in for the
// real gateway + ARB + PULSE so GLY can be built and demoed on its own.

import { randomUUID } from "node:crypto";
import type { TaskBus } from "../shared/tasks/index.ts";
import type {
  ARBResearchPayload,
  CallAck,
  PalCallEnvelope,
  PulsePaymentRequest,
  PurchasePrepRequest,
  TaskEvent,
  TransactionQueryRequest,
} from "../shared/types/index.ts";

export interface CallsGateway {
  /** Must resolve as soon as the call is accepted, never after the work is done. */
  send(envelope: PalCallEnvelope): Promise<CallAck>;
}

export type FakeCallsOptions = {
  /** How long the fake ARB/PULSE take to finish, in ms. */
  workMs?: number;
  /** Make the next N sends fail, to test retry handling. */
  failNext?: number;
};

/** DEMO ONLY. Every product, price and receipt it emits is made up. */
export class FakeCalls implements CallsGateway {
  readonly sent: PalCallEnvelope[] = [];
  private seenKeys = new Set<string>();
  private bus: TaskBus;
  private workMs: number;
  failNext: number;

  constructor(bus: TaskBus, opts: FakeCallsOptions = {}) {
    this.bus = bus;
    this.workMs = opts.workMs ?? 4000;
    this.failNext = opts.failNext ?? 0;
  }

  async send(env: PalCallEnvelope): Promise<CallAck> {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error("calls/ unavailable (simulated)");
    }
    this.sent.push(env);
    // Idempotency: the same key never starts the work twice.
    if (this.seenKeys.has(env.idempotencyKey)) return { accepted: true, taskId: env.taskId };
    this.seenKeys.add(env.idempotencyKey);

    setTimeout(() => this.finish(env), this.workMs).unref?.();
    return { accepted: true, taskId: env.taskId };
  }

  private emit(e: Omit<TaskEvent, "eventId" | "at">) {
    this.bus.publish({ ...e, eventId: randomUUID(), at: new Date().toISOString() } as TaskEvent);
  }

  private finish(env: PalCallEnvelope) {
    const taskId = env.taskId;
    switch (env.action) {
      case "research.start": {
        const p = env.payload as ARBResearchPayload;
        const cur = p.maxPrice?.currency ?? "USD";
        const cap = p.maxPrice?.value ?? 300;
        this.emit({
          taskId,
          type: "task.completed",
          data: {
            kind: "research",
            products: [0.62, 0.8, 0.95].map((f, i) => ({
              title: `${p.query} — demo option ${i + 1}`,
              merchant: ["Demo Store A", "Demo Store B", "Demo Store C"][i] ?? "Demo Store",
              price: { value: Math.round(cap * f), currency: cur },
              url: null,
              highlights: ["demo data", i === 0 ? "cheapest" : i === 2 ? "best rated" : "best value"],
            })),
          },
        });
        break;
      }
      case "purchase_prep.start": {
        const p = env.payload as PurchasePrepRequest;
        const cur = p.maxPrice?.currency ?? "USD";
        const list = p.maxPrice?.value ?? 120;
        this.emit({
          taskId,
          type: "proposal.ready",
          data: {
            proposalId: `prop_${randomUUID().slice(0, 8)}`,
            userId: p.userId,
            item: { title: `${p.query} (demo)`, merchant: "Demo Store B", url: null },
            listPrice: { value: list, currency: cur },
            finalPrice: { value: Math.round(list * 0.85 * 100) / 100, currency: cur },
            couponApplied: "DEMO15",
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          },
        });
        break;
      }
      case "payment.execute": {
        const p = env.payload as PulsePaymentRequest;
        this.emit({
          taskId,
          type: "task.completed",
          data: { kind: "payment", receiptId: `rcpt_${randomUUID().slice(0, 8)}`, amount: p.amount, merchant: p.merchant, status: "captured" },
        });
        break;
      }
      case "transaction.query": {
        const p = env.payload as TransactionQueryRequest;
        this.emit({
          taskId,
          type: "task.completed",
          data: {
            kind: "transactions",
            summary: `Demo ${p.kind.replace("_", " ")} result`,
            rows: [
              { date: "2026-10-28", description: "Demo Store A", amount: { value: 42.5, currency: "USD" } },
              { date: "2026-10-14", description: "Demo Store C", amount: { value: 18.99, currency: "USD" } },
            ],
          },
        });
        break;
      }
    }
  }
}

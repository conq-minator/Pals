// P5 step 1: turn the classifier's entities into the exact payload the other PAL expects.

import type {
  ARBResearchPayload,
  Money,
  PurchasePrepRequest,
  TaskRef,
  TransactionQueryRequest,
} from "../../shared/types/index.ts";
import type { IntentResult } from "../intent/schema.ts";

export type DelegatableAction = "research.start" | "purchase_prep.start" | "transaction.query";

export type BuiltPayload = {
  payload: ARBResearchPayload | PurchasePrepRequest | TransactionQueryRequest;
  summary: string; // short human description, used in acks and task lists
};

function budget(r: IntentResult): Money | null {
  const v = r.entities.budgetValue;
  return typeof v === "number" && v > 0 ? { value: v, currency: (r.entities.currency ?? "USD").toUpperCase() } : null;
}

const fmt = (m: Money) => `${m.currency === "USD" ? "$" : m.currency + " "}${m.value}`;

export function buildPayload(
  action: DelegatableAction,
  r: IntentResult,
  ctx: { userId: string; text: string; tasks: TaskRef[] },
): BuiltPayload {
  const maxPrice = budget(r);

  switch (action) {
    case "research.start": {
      const query = r.entities.product ?? ctx.text;
      return {
        payload: { userId: ctx.userId, query, maxPrice, notes: ctx.text },
        summary: maxPrice ? `${query} under ${fmt(maxPrice)}` : query,
      };
    }
    case "purchase_prep.start": {
      // Prefer the task the user pointed at; else the most recent research task.
      const research = ctx.tasks.filter((t) => t.action === "research.start");
      const pointed = research.find((t) => t.taskId === r.entities.refersToTaskId);
      const base = pointed ?? research[research.length - 1] ?? null;
      const query = r.entities.product ?? base?.summary ?? ctx.text;
      return {
        payload: { userId: ctx.userId, query, maxPrice, basedOnTaskId: base?.taskId ?? null },
        summary: `deal for ${query}`,
      };
    }
    case "transaction.query": {
      const kind = r.entities.transactionKind ?? (r.entities.orderId ? "order_status" : "history");
      const words: Record<TransactionQueryRequest["kind"], string> = {
        history: "your recent transactions",
        balance: "your balance",
        refund_status: "your refund status",
        order_status: "your order status",
      };
      return {
        payload: {
          userId: ctx.userId,
          kind,
          orderId: r.entities.orderId,
          dateFrom: r.entities.dateFrom,
          dateTo: r.entities.dateTo,
        },
        summary: words[kind],
      };
    }
  }
}

export function ackText(action: DelegatableAction | "payment.execute", summary: string): string {
  switch (action) {
    case "research.start":
      return `On it: looking for ${summary}. I'll show you the results when they're ready. Ask me anything meanwhile.`;
    case "purchase_prep.start":
      return `Getting the best ${summary} ready, including any coupons. I'll bring you an offer to approve.`;
    case "transaction.query":
      return `Checking ${summary} now. I'll show you as soon as it's back.`;
    case "payment.execute":
      return `Approved. I've sent this to PULSE for payment and will show your receipt when it's done.`;
  }
}

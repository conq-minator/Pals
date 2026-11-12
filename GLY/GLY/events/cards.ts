// P6 step 3: turn a finished-task event into a card (plus a one-line message).

import type { PurchaseProposal, TaskEvent, TaskRef } from "../../shared/types/index.ts";
import type { Card } from "../chat/outbound.ts";

export function proposalCard(p: PurchaseProposal): Card {
  return {
    kind: "approval",
    proposalId: p.proposalId,
    title: p.item.title,
    merchant: p.item.merchant,
    listPrice: p.listPrice,
    finalPrice: p.finalPrice,
    couponApplied: p.couponApplied,
    expiresAt: p.expiresAt,
  };
}

/** Returns what to show for an event, or null for events that only update status. */
export function presentEvent(e: TaskEvent, task: TaskRef): { text: string; card?: Card } | null {
  switch (e.type) {
    case "task.progress":
      return null;
    case "task.failed":
      return {
        text: `I couldn't finish ${task.summary}.`,
        card: { kind: "error", title: `Couldn't finish ${task.summary}`, detail: e.data.reason },
      };
    case "proposal.ready":
      return { text: `Here's the best offer I found. Approve it if you'd like to buy.`, card: proposalCard(e.data) };
    case "task.completed": {
      const d = e.data;
      if (d.kind === "research") {
        return d.products.length
          ? {
              text: `Found ${d.products.length} options for ${task.summary}.`,
              card: { kind: "product_results", taskId: task.taskId, title: task.summary, products: d.products },
            }
          : { text: `I couldn't find anything matching ${task.summary}. Want me to widen the search?` };
      }
      if (d.kind === "payment") {
        return {
          text: d.status === "captured" ? `Payment done.` : `The payment was declined.`,
          card: { kind: "payment_receipt", receiptId: d.receiptId, amount: d.amount, merchant: d.merchant, status: d.status },
        };
      }
      return { text: d.summary, card: { kind: "transactions", summary: d.summary, rows: d.rows } };
    }
  }
}

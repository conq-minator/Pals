// What GLY sends to the user's screen, and how it gets there.

import type { Money, ProductResult } from "../../shared/types/index.ts";
import type { SessionStore } from "./session.ts";

export type Card =
  | { kind: "product_results"; taskId: string; title: string; products: ProductResult[] }
  | {
      kind: "approval";
      proposalId: string;
      title: string;
      merchant: string;
      listPrice: Money;
      finalPrice: Money;
      couponApplied: string | null;
      expiresAt: string;
    }
  | { kind: "payment_receipt"; receiptId: string; amount: Money; merchant: string; status: "captured" | "declined" }
  | { kind: "transactions"; summary: string; rows: { date: string; description: string; amount: Money }[] }
  | { kind: "action_link"; title: string; label: string; url: string }
  | { kind: "error"; title: string; detail: string };

export type Source = { n: number; title: string; url: string };

export type OutboundEvent =
  | { type: "message"; text: string }
  | { type: "token"; streamId: string; text: string }
  | { type: "stream_end"; streamId: string; sources: Source[] }
  | { type: "card"; card: Card }
  | { type: "error"; text: string };

type Sender = (event: OutboundEvent) => void;

/**
 * Routes outbound events to the user's open socket(s). When the user is
 * offline, durable events (messages, cards) wait in their inbox.
 * Streaming tokens are never stored.
 */
export class Delivery {
  private sockets = new Map<string, Set<Sender>>();
  private sessions: SessionStore;

  constructor(sessions: SessionStore) {
    this.sessions = sessions;
  }

  connect(sessionId: string, send: Sender) {
    let set = this.sockets.get(sessionId);
    if (!set) this.sockets.set(sessionId, (set = new Set()));
    set.add(send);
    const session = this.sessions.peek(sessionId);
    if (session && session.inbox.length) {
      for (const e of session.inbox.splice(0)) send(e);
    }
  }

  disconnect(sessionId: string, send: Sender) {
    this.sockets.get(sessionId)?.delete(send);
  }

  isOnline(sessionId: string) {
    return (this.sockets.get(sessionId)?.size ?? 0) > 0;
  }

  deliver(sessionId: string, event: OutboundEvent) {
    const set = this.sockets.get(sessionId);
    if (set && set.size) {
      for (const send of set) send(event);
      return;
    }
    if (event.type === "message" || event.type === "card" || event.type === "error") {
      this.sessions.peek(sessionId)?.inbox.push(event);
    }
  }
}

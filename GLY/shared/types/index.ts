// Shared PALS contracts. These mirror API_CONTRACTS.md; field names are GLY's
// proposal and must be agreed with the ARB and PULSE owners before going live.

export type PalName = "GLY" | "ARB" | "PULSE";

export type PalAction =
  | "research.start"
  | "purchase_prep.start"
  | "payment.execute"
  | "transaction.query";

export type Money = { value: number; currency: string };

// ---------- Chat ----------

export type ChatTurn = { role: "user" | "assistant"; text: string; at: string };

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export type TaskRef = {
  taskId: string;
  target: PalName;
  action: PalAction;
  status: TaskStatus;
  summary: string; // human words, e.g. "headphones under $200"
  createdAt: string;
  updatedAt: string;
  nudged?: boolean; // a "still working" note was already sent
};

export type InboundMessage = {
  messageId: string;
  sessionId: string;
  userId: string;
  text: string;
  receivedAt: string;
  correlationId: string;
  history: ChatTurn[];
  /** Last few tasks of any status, newest last, so "the second one" can be resolved. */
  recentTasks: TaskRef[];
};

// ---------- Payloads GLY sends ----------

export type ARBResearchPayload = {
  userId: string;
  query: string;
  maxPrice: Money | null;
  notes: string | null;
};

// API_CONTRACTS lists `PurchaseProposal` as the payload for purchase_prep.start.
// A proposal is what ARB *returns*, so GLY sends this request instead.
// Open question for the ARB owner.
export type PurchasePrepRequest = {
  userId: string;
  query: string;
  maxPrice: Money | null;
  basedOnTaskId: string | null; // the research task the user is referring to
};

export type PulsePaymentRequest = {
  userId: string;
  proposalId: string;
  amount: Money;
  merchant: string;
};

export type TransactionQueryRequest = {
  userId: string;
  kind: "history" | "balance" | "refund_status" | "order_status";
  orderId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export type PalCallEnvelope<T = unknown> = {
  taskId: string;
  correlationId: string;
  sessionId: string;
  from: "GLY";
  to: Exclude<PalName, "GLY">;
  action: PalAction;
  idempotencyKey: string;
  payload: T;
  sentAt: string;
};

export type CallAck = { accepted: boolean; taskId: string; reason?: string };

// ---------- Results GLY receives ----------

export type PurchaseProposal = {
  proposalId: string;
  userId: string;
  item: { title: string; merchant: string; url: string | null };
  listPrice: Money;
  finalPrice: Money;
  couponApplied: string | null;
  expiresAt: string;
};

export type ProductResult = {
  title: string;
  merchant: string;
  price: Money;
  url: string | null;
  highlights: string[];
};

export type TaskEvent =
  | { eventId: string; taskId: string; at: string; type: "task.progress"; data: { note: string } }
  | { eventId: string; taskId: string; at: string; type: "task.failed"; data: { reason: string } }
  | { eventId: string; taskId: string; at: string; type: "proposal.ready"; data: PurchaseProposal }
  | {
      eventId: string;
      taskId: string;
      at: string;
      type: "task.completed";
      data:
        | { kind: "research"; products: ProductResult[] }
        | { kind: "payment"; receiptId: string; amount: Money; merchant: string; status: "captured" | "declined" }
        | { kind: "transactions"; summary: string; rows: { date: string; description: string; amount: Money }[] };
    };

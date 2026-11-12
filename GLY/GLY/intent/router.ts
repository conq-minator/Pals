// P2 stage 3: plain code decides where a labelled message goes.
// The LLM only labels; this table is the only thing that picks a path.

import type { SearchFilter } from "../../shared/db/vector/index.ts";
import type { PalAction, TaskRef } from "../../shared/types/index.ts";
import type { IntentResult } from "./schema.ts";

export type RouteDecision =
  | { kind: "rag"; question: string; filter: SearchFilter }
  | { kind: "delegate"; target: "ARB" | "PULSE"; action: Exclude<PalAction, "payment.execute"> }
  | { kind: "payment_pointer" } // payments only happen from the approval card (P7)
  | { kind: "task_status" }
  | { kind: "smalltalk" }
  | { kind: "clarify"; question: string };

const DEFAULT_CLARIFY =
  "Sorry, I didn't quite get that. Do you have a PayPal question, want me to find a product, or want to check your transactions?";

export function route(
  r: IntentResult,
  ctx: { text: string; recentTasks: TaskRef[]; confidenceMin: number },
): RouteDecision {
  const clarify = (fallback: string): RouteDecision => ({ kind: "clarify", question: r.clarifyingQuestion ?? fallback });

  if (r.intent === "unclear" || r.confidence < ctx.confidenceMin) return clarify(DEFAULT_CLARIFY);

  switch (r.intent) {
    case "paypal_guidance": {
      const filter: SearchFilter = {};
      if (r.entities.audience) filter.audience = r.entities.audience;
      if (r.entities.region) filter.region = r.entities.region.toUpperCase();
      // Topic is a hint for ranking only; filtering on it hides cross-topic answers.
      return { kind: "rag", question: r.standaloneQuestion?.trim() || ctx.text, filter };
    }
    case "shopping_research":
      if (!r.entities.product) return clarify("What would you like me to look for?");
      return { kind: "delegate", target: "ARB", action: "research.start" };

    case "purchase_prep": {
      const hasResearch = ctx.recentTasks.some((t) => t.action === "research.start") || !!r.entities.refersToTaskId;
      if (!r.entities.product && !hasResearch) return clarify("Which item should I get ready for you?");
      return { kind: "delegate", target: "ARB", action: "purchase_prep.start" };
    }
    case "transaction_query":
      return { kind: "delegate", target: "PULSE", action: "transaction.query" };

    case "payment_request":
      return { kind: "payment_pointer" };

    case "task_status":
      return { kind: "task_status" };

    case "smalltalk":
      return { kind: "smalltalk" };
  }
  return clarify(DEFAULT_CLARIFY);
}

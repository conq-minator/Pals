// The form the LLM must fill in for every message (ADR-GLY-001).
// Every key is required and nullable so it works with strict structured outputs.

import { z } from "zod";

export const INTENTS = [
  "paypal_guidance", // a question about how PayPal works -> RAG (P4)
  "shopping_research", // find / compare products -> ARB research.start
  "purchase_prep", // get a specific item ready to buy, find coupons -> ARB purchase_prep.start
  "transaction_query", // past payments, balance, refund or order status -> PULSE transaction.query
  "payment_request", // "pay for it", "refund my order" -> never pays; points to approval card
  "task_status", // "is my search done?"
  "smalltalk", // greetings, thanks
  "unclear", // cannot tell
] as const;

export const PAYPAL_TOPICS = [
  "fees",
  "disputes",
  "buyer_protection",
  "seller_protection",
  "refunds",
  "account",
  "kyc",
  "api",
  "payments",
  "other",
] as const;

export const IntentResultSchema = z.object({
  intent: z.enum(INTENTS),
  confidence: z.number().describe("0 to 1. How sure you are about the intent."),
  standaloneQuestion: z
    .string()
    .nullable()
    .describe("For paypal_guidance: the user's question rewritten so it makes sense without the chat history."),
  clarifyingQuestion: z
    .string()
    .nullable()
    .describe("If the intent is unclear or a required detail is missing: one short question to ask the user."),
  entities: z.object({
    product: z.string().nullable().describe("What the user wants to find or buy, in their words."),
    budgetValue: z.number().nullable().describe("Maximum price as a number, e.g. 200."),
    currency: z.string().nullable().describe("ISO currency code, e.g. USD. Null if not stated."),
    orderId: z.string().nullable(),
    dateFrom: z.string().nullable().describe("YYYY-MM-DD"),
    dateTo: z.string().nullable().describe("YYYY-MM-DD"),
    transactionKind: z.enum(["history", "balance", "refund_status", "order_status"]).nullable(),
    paypalTopic: z.enum(PAYPAL_TOPICS).nullable(),
    audience: z.enum(["consumer", "developer", "merchant"]).nullable(),
    region: z.string().nullable().describe("Country code if the user mentioned one, e.g. US, UK, IN."),
    refersToTaskId: z.string().nullable().describe("If the user refers to an earlier task listed in context, its taskId."),
  }),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;
export type Intent = IntentResult["intent"];

export const UNCLEAR_RESULT: IntentResult = {
  intent: "unclear",
  confidence: 0,
  standaloneQuestion: null,
  clarifyingQuestion: null,
  entities: {
    product: null,
    budgetValue: null,
    currency: null,
    orderId: null,
    dateFrom: null,
    dateTo: null,
    transactionKind: null,
    paypalTopic: null,
    audience: null,
    region: null,
    refersToTaskId: null,
  },
};

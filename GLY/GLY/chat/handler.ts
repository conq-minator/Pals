// GlyService: wires P1 -> P2 -> (P4 | P5) and P7. Transport-agnostic, so the
// WebSocket layer and the tests both drive it the same way.

import { randomUUID } from "node:crypto";
import type { CallsGateway } from "../../calls/index.ts";
import type { Embedder, VectorStore } from "../../shared/db/vector/index.ts";
import type { LlmGateway } from "../../shared/llm/index.ts";
import type { Logger } from "../../shared/logging/index.ts";
import type { TaskBus } from "../../shared/tasks/index.ts";
import type { InboundMessage } from "../../shared/types/index.ts";
import type { GlyConfig } from "../config.ts";
import { classifyIntent } from "../intent/classify.ts";
import { route, type RouteDecision } from "../intent/router.ts";
import type { IntentResult } from "../intent/schema.ts";
import { answerPaypalQuestion } from "../rag/answer.ts";
import { ackText, buildPayload } from "../delegation/payloads.ts";
import { Delegator } from "../delegation/send.ts";
import { ApprovalService } from "../events/approval.ts";
import { ResultListener } from "../events/listener.ts";
import { Delivery } from "./outbound.ts";
import { SessionStore, type Session } from "./session.ts";

export const MAX_MESSAGE_CHARS = 4000;

export type GlyDeps = {
  config: GlyConfig;
  llm: LlmGateway;
  rag: { store: VectorStore; embedder: Embedder };
  calls: CallsGateway;
  bus: TaskBus;
  log: Logger;
  now?: () => number;
};

export const LLM_DOWN =
  "I'm having trouble reaching my AI service right now, so I can't understand messages at the moment. Please try again shortly.";

const SMALLTALK =
  "Happy to help! I can explain how PayPal works, find and compare products for you, or check your transactions.";

export class GlyService {
  readonly sessions = new SessionStore();
  readonly delivery = new Delivery(this.sessions);
  readonly delegator: Delegator;
  readonly approvals: ApprovalService;
  readonly listener: ResultListener;
  private deps: GlyDeps;

  constructor(deps: GlyDeps) {
    this.deps = deps;
    const log = deps.log;
    this.delegator = new Delegator({ calls: deps.calls, sessions: this.sessions, config: deps.config, log: log.child({ part: "P5" }) });
    this.approvals = new ApprovalService({ delegator: this.delegator, log: log.child({ part: "P7" }), now: deps.now });
    this.listener = new ResultListener({
      bus: deps.bus,
      sessions: this.sessions,
      delivery: this.delivery,
      approvals: this.approvals,
      config: deps.config,
      log: log.child({ part: "P6" }),
      now: deps.now,
    });
  }

  start() {
    this.listener.start();
  }

  stop() {
    this.listener.stop();
  }

  // ---------------- P1: Message In ----------------

  async handleUserMessage(input: { sessionId: string; userId: string; text: string }): Promise<void> {
    const correlationId = randomUUID();
    const log = this.deps.log.child({ correlationId, sessionId: input.sessionId });
    const text = input.text.trim();

    if (!text) return this.delivery.deliver(input.sessionId, { type: "error", text: "That message was empty." });
    if (text.length > MAX_MESSAGE_CHARS) {
      return this.delivery.deliver(input.sessionId, {
        type: "error",
        text: `That message is too long. Please keep it under ${MAX_MESSAGE_CHARS} characters.`,
      });
    }

    let session: Session;
    try {
      session = this.sessions.open(input.sessionId, input.userId);
    } catch {
      return this.delivery.deliver(input.sessionId, { type: "error", text: "This chat belongs to a different account." });
    }

    const msg: InboundMessage = {
      messageId: randomUUID(),
      sessionId: session.sessionId,
      userId: session.userId,
      text,
      receivedAt: new Date((this.deps.now ?? Date.now)()).toISOString(),
      correlationId,
      history: this.sessions.recentHistory(session, this.deps.config.historyTurns),
      recentTasks: [...session.tasks.values()].slice(-10),
    };
    this.sessions.addTurn(session, "user", text);
    log.info("message received", { chars: text.length });

    try {
      // P2: label it, then plain code picks the path.
      const intent = await classifyIntent(this.deps.llm, msg, log.child({ part: "P2" }), (note) => {
        this.delivery.deliver(session.sessionId, { type: "status", text: note });
      });
      if (intent.llmUnavailable) {
        const text = LLM_DOWN;
        this.delivery.deliver(session.sessionId, { type: "error", text });
        this.sessions.addTurn(session, "assistant", text);
        return;
      }
      const decision = route(intent, { text, recentTasks: msg.recentTasks, confidenceMin: this.deps.config.intentConfidenceMin });
      log.info("routed", { decision: decision.kind });

      const reply = await this.act(decision, intent, msg, session, log);
      if (reply) this.sessions.addTurn(session, "assistant", reply);
    } catch (err) {
      log.error("message handling failed", { error: String(err) });
      this.delivery.deliver(session.sessionId, {
        type: "error",
        text: "Something went wrong on my side. Please try again in a moment.",
      });
    }
  }

  private say(session: Session, text: string): string {
    this.delivery.deliver(session.sessionId, { type: "message", text });
    return text;
  }

  private async act(d: RouteDecision, intent: IntentResult, msg: InboundMessage, session: Session, log: Logger): Promise<string> {
    switch (d.kind) {
      case "clarify":
        return this.say(session, d.question);

      case "smalltalk":
        return this.say(session, SMALLTALK);

      case "rag": // P4
        return answerPaypalQuestion({
          llm: this.deps.llm,
          rag: this.deps.rag,
          delivery: this.delivery,
          config: this.deps.config,
          log: log.child({ part: "P4" }),
          sessionId: session.sessionId,
          question: d.question,
          filter: d.filter,
          topic: intent.entities.paypalTopic,
        });

      case "delegate": { // P5: send it off and reply now
        const built = buildPayload(d.action, intent, { userId: session.userId, text: msg.text, tasks: [...session.tasks.values()] });
        const res = await this.delegator.delegate({
          session,
          correlationId: msg.correlationId,
          action: d.action,
          payload: built.payload,
          summary: built.summary,
        });
        if (!res.ok) {
          return this.say(session, `Sorry, I couldn't start that right now (the ${d.target === "ARB" ? "shopping" : "payments"} service didn't respond). Please try again in a minute.`);
        }
        return this.say(session, ackText(d.action, built.summary));
      }

      case "task_status": {
        const open = this.sessions.openTasks(session);
        if (!open.length) return this.say(session, "Nothing is running right now. Everything I started for you has finished.");
        const lines = open.map((t) => `• ${t.summary} (${t.status === "pending" ? "started" : "in progress"})`).join("\n");
        return this.say(session, `Still working on:\n${lines}`);
      }

      case "payment_pointer": {
        // Payments only happen from the approval card. Chat text never pays.
        if (/\brefund/i.test(msg.text)) {
          return this.say(session, "I can't start a refund from chat. I can check the status of a refund, or explain how PayPal refunds and disputes work.");
        }
        const cards = this.approvals.openCards(session);
        if (!cards.length) {
          return this.say(session, "There's nothing ready to pay for yet. Tell me what you want to buy and I'll find you an offer to approve first.");
        }
        for (const card of cards) this.delivery.deliver(session.sessionId, { type: "card", card });
        return this.say(session, "To pay, tap Approve on the offer card. For your safety I never pay from a chat message alone.");
      }
    }
  }

  // ---------------- P7: Approval ----------------

  async handleApproval(input: { sessionId: string; userId: string; proposalId: string; decision: "approve" | "reject" }) {
    const session = this.sessions.peek(input.sessionId);
    if (!session) return this.delivery.deliver(input.sessionId, { type: "error", text: "I can't find that chat." });
    const outcome = await this.approvals.decide({ ...input, session, correlationId: randomUUID() });
    this.delivery.deliver(session.sessionId, outcome.ok ? { type: "message", text: outcome.text } : { type: "error", text: outcome.text });
    this.sessions.addTurn(session, "assistant", outcome.text);
  }
}

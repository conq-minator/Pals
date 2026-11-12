// P5 steps 3-6: send through calls/, record the task, never wait for the work.

import type { CallsGateway } from "../../calls/index.ts";
import type { Logger } from "../../shared/logging/index.ts";
import type { PalAction, TaskRef } from "../../shared/types/index.ts";
import type { GlyConfig } from "../config.ts";
import type { Session, SessionStore } from "../chat/session.ts";
import { makeEnvelope } from "./envelope.ts";

export type DelegateResult = { ok: true; task: TaskRef } | { ok: false; reason: string };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`calls/ did not accept within ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export class Delegator {
  private calls: CallsGateway;
  private sessions: SessionStore;
  private config: GlyConfig;
  private log: Logger;

  constructor(deps: { calls: CallsGateway; sessions: SessionStore; config: GlyConfig; log: Logger }) {
    this.calls = deps.calls;
    this.sessions = deps.sessions;
    this.config = deps.config;
    this.log = deps.log;
  }

  /**
   * Resolves as soon as calls/ ACCEPTS the job (milliseconds), not when ARB or
   * PULSE finish it. Results arrive later on the task bus (P6).
   */
  async delegate(args: {
    session: Session;
    correlationId: string;
    action: PalAction;
    payload: unknown;
    summary: string;
    idempotencyKey?: string;
  }): Promise<DelegateResult> {
    const env = makeEnvelope({
      action: args.action,
      payload: args.payload,
      sessionId: args.session.sessionId,
      correlationId: args.correlationId,
      idempotencyKey: args.idempotencyKey,
    });
    const log = this.log.child({ correlationId: env.correlationId, taskId: env.taskId, action: env.action });

    let reason = "unknown error";
    // One retry with the SAME envelope and key, so a duplicate can't start the job twice.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const ack = await withTimeout(this.calls.send(env), this.config.callAckTimeoutMs);
        if (!ack.accepted) {
          // An explicit "no" is an answer, not a glitch: don't retry it.
          log.warn("calls/ rejected task", { reason: ack.reason });
          return { ok: false, reason: ack.reason ?? "rejected" };
        }
        const now = new Date().toISOString();
        const task: TaskRef = {
          taskId: env.taskId,
          target: env.to,
          action: env.action,
          status: "pending",
          summary: args.summary,
          createdAt: now,
          updatedAt: now,
        };
        this.sessions.addTask(args.session, task);
        log.info("task delegated", { attempt, target: env.to });
        return { ok: true, task };
      } catch (err) {
        reason = String(err instanceof Error ? err.message : err);
        log.warn("calls/ send failed", { attempt, error: reason });
      }
    }
    log.error("task delegation failed", { reason });
    return { ok: false, reason };
  }
}

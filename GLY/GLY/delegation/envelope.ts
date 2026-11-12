// P5 step 2: wrap a payload in the PalCallEnvelope "parcel label".

import { randomUUID } from "node:crypto";
import type { PalAction, PalCallEnvelope } from "../../shared/types/index.ts";

export const TARGET: Record<PalAction, "ARB" | "PULSE"> = {
  "research.start": "ARB",
  "purchase_prep.start": "ARB",
  "payment.execute": "PULSE",
  "transaction.query": "PULSE",
};

export function makeEnvelope<T>(args: {
  action: PalAction;
  payload: T;
  sessionId: string;
  correlationId: string;
  /** Same key = same job. Retries and double taps must reuse it. */
  idempotencyKey?: string;
  taskId?: string;
}): PalCallEnvelope<T> {
  const taskId = args.taskId ?? `task_${randomUUID()}`;
  return {
    taskId,
    correlationId: args.correlationId,
    sessionId: args.sessionId,
    from: "GLY",
    to: TARGET[args.action],
    action: args.action,
    idempotencyKey: args.idempotencyKey ?? taskId,
    payload: args.payload,
    sentAt: new Date().toISOString(),
  };
}

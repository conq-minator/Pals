// P6: listen for finished work on shared/tasks and put it in front of the user.

import type { Logger } from "../../shared/logging/index.ts";
import type { TaskBus } from "../../shared/tasks/index.ts";
import type { TaskEvent } from "../../shared/types/index.ts";
import type { GlyConfig } from "../config.ts";
import type { Delivery } from "../chat/outbound.ts";
import type { SessionStore } from "../chat/session.ts";
import type { ApprovalService } from "./approval.ts";
import { presentEvent } from "./cards.ts";

const SEEN_LIMIT = 10_000;

export class ResultListener {
  private seen = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;
  private deps: {
    bus: TaskBus;
    sessions: SessionStore;
    delivery: Delivery;
    approvals: ApprovalService;
    config: GlyConfig;
    log: Logger;
    now?: () => number;
  };

  constructor(deps: ResultListener["deps"]) {
    this.deps = deps;
  }

  start() {
    this.unsubscribe = this.deps.bus.subscribe((e) => this.handle(e));
    const every = Math.max(1000, Math.min(60_000, this.deps.config.staleTaskMs / 4));
    this.sweepTimer = setInterval(() => this.sweepStale(), every);
    this.sweepTimer.unref();
  }

  stop() {
    this.unsubscribe?.();
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  handle(e: TaskEvent) {
    const { sessions, delivery, approvals, log } = this.deps;
    if (this.seen.has(e.eventId)) return; // duplicate delivery from the bus
    this.remember(e.eventId);

    const found = sessions.findByTask(e.taskId);
    if (!found) {
      log.debug("event for unknown task ignored", { taskId: e.taskId, type: e.type });
      return;
    }
    const { session, task } = found;
    if (task.status === "completed" || task.status === "failed") return; // already final

    task.status =
      e.type === "task.failed" ? "failed" : e.type === "task.progress" ? "in_progress" : "completed";
    task.updatedAt = e.at;

    if (e.type === "proposal.ready") {
      if (e.data.userId !== session.userId) {
        log.error("proposal for a different user dropped", { taskId: e.taskId });
        return;
      }
      approvals.register(session, task.taskId, e.data);
    }

    const shown = presentEvent(e, task);
    if (!shown) return;
    delivery.deliver(session.sessionId, { type: "message", text: shown.text });
    if (shown.card) delivery.deliver(session.sessionId, { type: "card", card: shown.card });
    sessions.addTurn(session, "assistant", shown.text);
    log.info("result delivered", { taskId: e.taskId, type: e.type, online: delivery.isOnline(session.sessionId) });
  }

  /** A pending task with no news for a while gets one gentle "still working" note. */
  sweepStale() {
    const now = (this.deps.now ?? Date.now)();
    for (const s of this.deps.sessions.all()) {
      for (const t of this.deps.sessions.openTasks(s)) {
        if (!t.nudged && now - Date.parse(t.updatedAt) > this.deps.config.staleTaskMs) {
          t.nudged = true;
          this.deps.delivery.deliver(s.sessionId, {
            type: "message",
            text: `Still working on ${t.summary}. It's taking longer than usual; I'll let you know when it's done.`,
          });
        }
      }
    }
  }

  private remember(id: string) {
    this.seen.add(id);
    if (this.seen.size > SEEN_LIMIT) {
      const first = this.seen.values().next().value;
      if (first !== undefined) this.seen.delete(first);
    }
  }
}

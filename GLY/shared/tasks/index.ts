// Task bus client. Stand-in for the team's shared/tasks (in-process only).
// Swap InMemoryTaskBus for a Redis/NATS-backed one without touching GLY.

import { EventEmitter } from "node:events";
import type { TaskEvent } from "../types/index.ts";

export interface TaskBus {
  publish(event: TaskEvent): void;
  subscribe(handler: (event: TaskEvent) => void | Promise<void>): () => void;
}

export class InMemoryTaskBus implements TaskBus {
  private emitter = new EventEmitter();

  publish(event: TaskEvent): void {
    // Deliver on a later tick, like a real bus would.
    setImmediate(() => this.emitter.emit("event", event));
  }

  subscribe(handler: (event: TaskEvent) => void | Promise<void>): () => void {
    const wrapped = (e: TaskEvent) => void handler(e);
    this.emitter.on("event", wrapped);
    return () => this.emitter.off("event", wrapped);
  }
}

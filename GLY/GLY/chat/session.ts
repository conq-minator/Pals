// Per-chat state: history, running tasks, open proposals, offline inbox.
// In-memory for now; swap for Redis/Postgres when GLY runs on more than one node.

import type { ChatTurn, PurchaseProposal, TaskRef } from "../../shared/types/index.ts";
import type { OutboundEvent } from "./outbound.ts";

export type ProposalState = {
  proposal: PurchaseProposal;
  status: "open" | "approved" | "rejected" | "expired";
  taskId: string; // the ARB task that produced it
};

export type Session = {
  sessionId: string;
  userId: string;
  history: ChatTurn[];
  tasks: Map<string, TaskRef>;
  proposals: Map<string, ProposalState>;
  inbox: OutboundEvent[];
};

const MAX_STORED_TURNS = 50;

export class SessionStore {
  private sessions = new Map<string, Session>();
  private taskIndex = new Map<string, string>(); // taskId -> sessionId

  /** Get or create. Throws if the session belongs to another user. */
  open(sessionId: string, userId: string): Session {
    let s = this.sessions.get(sessionId);
    if (!s) {
      s = { sessionId, userId, history: [], tasks: new Map(), proposals: new Map(), inbox: [] };
      this.sessions.set(sessionId, s);
    }
    if (s.userId !== userId) throw new Error("session does not belong to this user");
    return s;
  }

  peek(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addTurn(s: Session, role: ChatTurn["role"], text: string) {
    s.history.push({ role, text, at: new Date().toISOString() });
    if (s.history.length > MAX_STORED_TURNS) s.history.splice(0, s.history.length - MAX_STORED_TURNS);
  }

  recentHistory(s: Session, turns: number): ChatTurn[] {
    return s.history.slice(-turns);
  }

  addTask(s: Session, task: TaskRef) {
    s.tasks.set(task.taskId, task);
    this.taskIndex.set(task.taskId, s.sessionId);
  }

  findByTask(taskId: string): { session: Session; task: TaskRef } | undefined {
    const sid = this.taskIndex.get(taskId);
    const session = sid ? this.sessions.get(sid) : undefined;
    const task = session?.tasks.get(taskId);
    return session && task ? { session, task } : undefined;
  }

  openTasks(s: Session): TaskRef[] {
    return [...s.tasks.values()].filter((t) => t.status === "pending" || t.status === "in_progress");
  }

  all(): Iterable<Session> {
    return this.sessions.values();
  }
}

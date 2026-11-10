import { CentralCallsSystem } from '../../calls/index.js';
import { PalsLogger } from '../../shared/logging/index.js';
import { PalCallEnvelope } from '../../shared/types/index.js';

export interface ProgressPayload {
  taskId: string;
  progressPercent: number;
  statusMessage: string;
  partialResultsFound?: number;
  emittedAt: string;
}

export type ProgressListener = (payload: ProgressPayload) => void;

/**
 * ARBProgressEmitter
 * Emits real-time task lifecycle progress events to GLY and Orchestrator via calls/
 * and supports task cancellation.
 */
export class ARBProgressEmitter {
  private static instance: ARBProgressEmitter;
  private logger = new PalsLogger('ARB:ProgressEmitter');
  private callsSystem = CentralCallsSystem.getInstance();
  private listeners: Set<ProgressListener> = new Set();
  private cancelledTasks: Set<string> = new Set();

  public static getInstance(): ARBProgressEmitter {
    if (!ARBProgressEmitter.instance) {
      ARBProgressEmitter.instance = new ARBProgressEmitter();
    }
    return ARBProgressEmitter.instance;
  }

  /**
   * Registers a local listener (useful for tests or web server SSE).
   */
  public addListener(listener: ProgressListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: ProgressListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Flags a task as cancelled by user request.
   */
  public cancelTask(taskId: string): void {
    this.cancelledTasks.add(taskId);
    this.logger.info(`Task ${taskId} marked as CANCELLED`);
  }

  /**
   * Checks whether a task has been cancelled.
   */
  public isCancelled(taskId: string): boolean {
    return this.cancelledTasks.has(taskId);
  }

  /**
   * Emits progress update via calls/ and notifies registered listeners.
   */
  public async emitProgress(
    taskId: string,
    correlationId: string,
    percent: number,
    statusMessage: string,
    partialResultsFound?: number
  ): Promise<void> {
    const payload: ProgressPayload = {
      taskId,
      progressPercent: Math.min(100, Math.max(0, percent)),
      statusMessage,
      partialResultsFound,
      emittedAt: new Date().toISOString()
    };

    // Notify in-process listeners
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch {
        // Suppress listener error
      }
    }

    // Dispatch inter-agent progress event through Central Calls System to GLY
    const envelope: PalCallEnvelope<ProgressPayload> = {
      callId: `call_prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      correlationId: correlationId || taskId,
      caller: 'ARB',
      callee: 'GLY',
      action: 'task.progress',
      payload,
      metadata: {
        timestamp: new Date().toISOString(),
        timeoutMs: 5000
      }
    };

    try {
      await this.callsSystem.dispatch(envelope);
    } catch {
      // Discard offline handler warning
    }
  }
}

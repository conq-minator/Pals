import { EventEmitter } from 'node:events';
import {
  TaskDelegationRequest,
  TaskLifecycleEvent,
  TaskStatus,
  PALIdentifier
} from '../types/index.js';
import { PalsLogger } from '../logging/index.js';

export interface TaskRecord {
  taskId: string;
  conversationId: string;
  userId: string;
  targetPal: PALIdentifier;
  taskType: string;
  status: TaskStatus;
  progressPercent: number;
  statusMessage?: string;
  payload: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export class TaskManager extends EventEmitter {
  private tasks: Map<string, TaskRecord> = new Map();
  private logger = new PalsLogger('TaskManager');

  constructor() {
    super();
  }

  /**
   * Registers a new delegated task.
   */
  public createTask(request: TaskDelegationRequest): TaskRecord {
    const task: TaskRecord = {
      taskId: request.taskId,
      conversationId: request.conversationId,
      userId: request.userId,
      targetPal: request.targetPal,
      taskType: request.taskType,
      status: 'PENDING',
      progressPercent: 0,
      statusMessage: 'Task registered and enqueued',
      payload: request.payload,
      createdAt: request.createdAt,
      updatedAt: request.createdAt
    };

    this.tasks.set(task.taskId, task);
    this.logger.info(`Task created: ${task.taskId} [${task.taskType} -> ${task.targetPal}]`, undefined, task.taskId);

    this.emitEvent({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskId: task.taskId,
      conversationId: task.conversationId,
      targetPal: task.targetPal,
      status: 'PENDING',
      progressPercent: 0,
      statusMessage: task.statusMessage,
      emittedAt: new Date().toISOString()
    });

    return task;
  }

  /**
   * Updates task status and emits a lifecycle event.
   */
  public updateStatus(
    taskId: string,
    status: TaskStatus,
    options?: {
      progressPercent?: number;
      statusMessage?: string;
      resultPayload?: Record<string, unknown>;
      error?: { code: string; message: string; details?: unknown };
    }
  ): TaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task '${taskId}' not found`);
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (options?.progressPercent !== undefined) {
      task.progressPercent = options.progressPercent;
    }
    if (options?.statusMessage !== undefined) {
      task.statusMessage = options.statusMessage;
    }
    if (options?.resultPayload !== undefined) {
      task.resultPayload = options.resultPayload;
    }
    if (options?.error !== undefined) {
      task.error = options.error;
    }

    this.logger.info(`Task ${taskId} transitioned to ${status}`, { progress: task.progressPercent }, taskId);

    this.emitEvent({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskId: task.taskId,
      conversationId: task.conversationId,
      targetPal: task.targetPal,
      status: task.status,
      progressPercent: task.progressPercent,
      statusMessage: task.statusMessage,
      resultPayload: task.resultPayload,
      error: task.error,
      emittedAt: task.updatedAt
    });

    return task;
  }

  public getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  public getTasksByConversation(conversationId: string): TaskRecord[] {
    return Array.from(this.tasks.values()).filter(t => t.conversationId === conversationId);
  }

  private emitEvent(event: TaskLifecycleEvent): void {
    this.emit('task_event', event);
    this.emit(`task_event:${event.taskId}`, event);
    this.emit(`conversation_event:${event.conversationId}`, event);
  }
}


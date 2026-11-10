import {
  PalCallEnvelope,
  PalCallResponse,
  PalCallEnvelopeSchema,
  PALIdentifier
} from '../shared/types/index.js';
import { PalsLogger } from '../shared/logging/index.js';

export type CallHandler<T = unknown, R = unknown> = (
  envelope: PalCallEnvelope<T>
) => Promise<R>;

/**
 * Central Calls System (calls/)
 * The single communication gateway and message dispatcher between all PALS.
 */
export class CentralCallsSystem {
  private static instance: CentralCallsSystem;
  private logger = new PalsLogger('CentralCallsSystem');
  private handlers: Map<string, CallHandler<any, any>> = new Map();

  private constructor() {}

  public static getInstance(): CentralCallsSystem {
    if (!CentralCallsSystem.instance) {
      CentralCallsSystem.instance = new CentralCallsSystem();
    }
    return CentralCallsSystem.instance;
  }

  /**
   * Registers a PAL's callable action with the gateway.
   * Key pattern: `${callee}:${action}` (e.g. 'ARB:research.start', 'PULSE:payment.execute')
   */
  public registerHandler<T, R>(
    callee: PALIdentifier,
    action: string,
    handler: CallHandler<T, R>
  ): void {
    const key = `${callee}:${action}`;
    if (this.handlers.has(key)) {
      this.logger.warn(`Overwriting call handler for ${key}`);
    }
    this.handlers.set(key, handler);
    this.logger.debug(`Registered handler for action: ${key}`);
  }

  /**
   * Dispatches an inter-agent call envelope through the central system.
   */
  public async dispatch<T = Record<string, unknown>, R = unknown>(
    envelope: PalCallEnvelope<T>
  ): Promise<PalCallResponse<R>> {
    const startTime = Date.now();
    const { callId, correlationId, caller, callee, action } = envelope;

    this.logger.info(
      `Dispatched Call: [${caller} -> ${callee}] Action: '${action}'`,
      { callId, correlationId },
      correlationId
    );

    // 1. Validate envelope schema
    const parseResult = PalCallEnvelopeSchema.safeParse(envelope);
    if (!parseResult.success) {
      return {
        callId,
        correlationId,
        responder: callee,
        status: 'ERROR',
        error: {
          code: 'INVALID_CALL_ENVELOPE',
          message: 'Call envelope failed schema validation',
          details: parseResult.error.format()
        },
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString()
      };
    }

    // 2. Lookup destination handler
    const handlerKey = `${callee}:${action}`;
    const handler = this.handlers.get(handlerKey);

    if (!handler) {
      this.logger.error(`No handler registered for ${handlerKey}`, undefined, correlationId);
      return {
        callId,
        correlationId,
        responder: callee,
        status: 'ERROR',
        error: {
          code: 'UNSUPPORTED_ACTION',
          message: `Callee '${callee}' has no registered handler for action '${action}'`
        },
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString()
      };
    }

    // 3. Execute with timeout guard
    const timeoutMs = envelope.metadata.timeoutMs || 30000;
    try {
      const callPromise = handler(envelope);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Call timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      const result = await Promise.race([callPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      this.logger.info(
        `Call Succeeded: [${caller} -> ${callee}] Action: '${action}' (${durationMs}ms)`,
        undefined,
        correlationId
      );

      return {
        callId,
        correlationId,
        responder: callee,
        status: 'SUCCESS',
        data: result,
        durationMs,
        completedAt: new Date().toISOString()
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err instanceof Error && err.message.includes('timeout');

      this.logger.error(
        `Call Failed: [${caller} -> ${callee}] Action: '${action}' - ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        correlationId
      );

      return {
        callId,
        correlationId,
        responder: callee,
        status: isTimeout ? 'TIMEOUT' : 'ERROR',
        error: {
          code: isTimeout ? 'CALL_TIMEOUT' : 'EXECUTION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown execution failure'
        },
        durationMs,
        completedAt: new Date().toISOString()
      };
    }
  }
}


export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  module: string;
  message: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export class PalsLogger {
  private moduleName: string;
  private static sensitiveKeys = [
    'password',
    'secret',
    'token',
    'client_secret',
    'authorization',
    'card',
    'cvv',
    'key',
    'cookie'
  ];

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  private maskSensitive(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitive(item));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (PalsLogger.sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        masked[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitive(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  private write(level: LogLevel, message: string, data?: Record<string, unknown>, correlationId?: string): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      module: this.moduleName,
      message,
      correlationId,
      data: data ? (this.maskSensitive(data) as Record<string, unknown>) : undefined
    };

    const formatted = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]${entry.correlationId ? ` [${entry.correlationId}]` : ''} ${entry.message}`;
    
    if (level === 'error') {
      console.error(formatted, entry.data ? JSON.stringify(entry.data) : '');
    } else if (level === 'warn') {
      console.warn(formatted, entry.data ? JSON.stringify(entry.data) : '');
    } else {
      console.log(formatted, entry.data ? JSON.stringify(entry.data) : '');
    }
  }

  public debug(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.write('debug', message, data, correlationId);
  }

  public info(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.write('info', message, data, correlationId);
  }

  public warn(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.write('warn', message, data, correlationId);
  }

  public error(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.write('error', message, data, correlationId);
  }
}


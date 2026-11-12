// Minimal structured JSON logger. Stand-in for the team's shared/logging.

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = (process.env.LOG_LEVEL ?? "info") as Level | "silent";
  if (env === "silent") return Infinity;
  return ORDER[env] ?? ORDER.info;
}

export type Logger = {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
};

export function createLogger(module: string, base: Record<string, unknown> = {}): Logger {
  const write = (level: Level, msg: string, fields?: Record<string, unknown>) => {
    if (ORDER[level] < threshold()) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, module, msg, ...base, ...fields });
    (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
  };
  return {
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (fields) => createLogger(module, { ...base, ...fields }),
  };
}

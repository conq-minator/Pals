// All GLY tunables in one place. Every value can be overridden by env vars.

const num = (name: string, fallback: number) => {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : Number(v);
};

export type GlyConfig = {
  port: number;
  /** "gemini" (default) or "anthropic". */
  llmProvider: "gemini" | "anthropic";
  /** Fast model for intent routing (ADR-GLY-001). */
  intentModel: string;
  /** Model for grounded PayPal answers. */
  answerModel: string;
  /** Below this, P2 asks a clarifying question instead of routing. */
  intentConfidenceMin: number;
  /** Below this best-match score, P4 says "not found" instead of answering. Null = use the embedder's suggestion. */
  ragScoreMin: number | null;
  ragTopK: number;
  historyTurns: number;
  /** How long to wait for calls/ to *accept* a task (not finish it). */
  callAckTimeoutMs: number;
  /** A pending task with no events for this long gets a "still working" note. */
  staleTaskMs: number;
  paypalHelpUrl: string;
};

export function loadConfig(overrides: Partial<GlyConfig> = {}): GlyConfig {
  return {
    port: num("GLY_PORT", 8787),
    llmProvider: process.env.GLY_LLM_PROVIDER === "anthropic" ? "anthropic" : "gemini",
    intentModel: process.env.GLY_INTENT_MODEL ?? (process.env.GLY_LLM_PROVIDER === "anthropic" ? "claude-haiku-5-5" : "gemini-3.5-flash"),
    answerModel: process.env.GLY_ANSWER_MODEL ?? (process.env.GLY_LLM_PROVIDER === "anthropic" ? "claude-opus-5-5" : "gemini-3.5-flash"),
    intentConfidenceMin: num("GLY_INTENT_CONFIDENCE_MIN", 0.6),
    ragScoreMin: process.env.GLY_RAG_SCORE_MIN ? Number(process.env.GLY_RAG_SCORE_MIN) : null,
    ragTopK: num("GLY_RAG_TOP_K", 8),
    historyTurns: num("GLY_HISTORY_TURNS", 10),
    callAckTimeoutMs: num("GLY_CALL_ACK_TIMEOUT_MS", 3000),
    staleTaskMs: num("GLY_STALE_TASK_MS", 5 * 60_000),
    paypalHelpUrl: "https://www.paypal.com/us/cshelp/personal",
    ...overrides,
  };
}

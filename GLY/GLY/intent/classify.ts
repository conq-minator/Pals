// P2 stage 1+2: ask the LLM to label the message, then validate the label.

import type { LlmGateway } from "../../shared/llm/index.ts";
import type { Logger } from "../../shared/logging/index.ts";
import type { InboundMessage } from "../../shared/types/index.ts";
import { buildIntentPrompt } from "./prompt.ts";
import { IntentResultSchema, UNCLEAR_RESULT, type IntentResult } from "./schema.ts";

/**
 * `llmUnavailable` is set when every attempt threw (bad API key, network down,
 * quota). That is different from the model honestly not understanding the
 * message, and the user should be told so instead of being asked to rephrase.
 */
export type ClassifyResult = IntentResult & { llmUnavailable?: boolean };

export async function classifyIntent(llm: LlmGateway, msg: InboundMessage, log: Logger): Promise<ClassifyResult> {
  const prompt = buildIntentPrompt(msg);
  let errors = 0;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await llm.structured(prompt, IntentResultSchema);
      const parsed = IntentResultSchema.safeParse(raw);
      if (parsed.success) {
        const result = { ...parsed.data, confidence: clamp01(parsed.data.confidence) };
        log.info("intent classified", { intent: result.intent, confidence: result.confidence, attempt });
        return result;
      }
      log.warn("intent output failed validation", { attempt, issues: parsed.error.issues.slice(0, 3).map((i) => i.message) });
    } catch (err) {
      errors++;
      lastError = err instanceof Error ? err.message : String(err);
      log.warn("intent classification error", { attempt, error: lastError });
    }
  }

  if (errors === 2) {
    log.error("LLM unavailable for intent classification", { error: lastError });
    return { ...UNCLEAR_RESULT, llmUnavailable: true };
  }
  log.warn("intent fell back to unclear");
  return UNCLEAR_RESULT;
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

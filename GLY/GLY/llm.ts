// Builds the LLM gateway from config. Used by the server and the intent eval.

import { GeminiLlm } from "../shared/llm/gemini.ts";
import { AnthropicLlm, type LlmGateway } from "../shared/llm/index.ts";
import type { GlyConfig } from "./config.ts";

export function createLlm(config: GlyConfig): LlmGateway {
  const models = { structuredModel: config.intentModel, answerModel: config.answerModel };
  if (config.llmProvider === "anthropic") return new AnthropicLlm(models);

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey");
  return new GeminiLlm({ apiKey, ...models });
}

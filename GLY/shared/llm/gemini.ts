// Gemini implementation of the shared LLM gateway.
// Needs GEMINI_API_KEY (free key from https://aistudio.google.com/apikey).

import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import type { LlmGateway, LlmPrompt } from "./index.ts";

export type GeminiLlmOptions = {
  apiKey: string;
  /** Model for intent routing. Runs with minimal thinking for speed. */
  structuredModel: string;
  /** Model for grounded RAG answers. */
  answerModel: string;
};

/** True when Gemini stopped the reply for safety or similar reasons. */
function blocked(res: GenerateContentResponse): boolean {
  if (res.promptFeedback?.blockReason) return true;
  const reason = res.candidates?.[0]?.finishReason;
  return reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCKLIST" || reason === "SPII";
}

/** Zod's JSON Schema minus the `$schema` URL line, which Gemini doesn't need. */
export function geminiSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

export class GeminiLlm implements LlmGateway {
  private ai: GoogleGenAI;
  private opts: GeminiLlmOptions;

  constructor(opts: GeminiLlmOptions) {
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
    this.opts = opts;
  }

  /** Looks up each model (free, generates nothing) to prove the key and model names work. */
  async check(): Promise<void> {
    for (const model of new Set([this.opts.structuredModel, this.opts.answerModel])) {
      try {
        await this.ai.models.get({ model });
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        const detail = err instanceof Error ? err.message : String(err);
        if (status === 400 || status === 401 || status === 403) {
          throw new Error(
            `Gemini rejected the API key (HTTP ${status}). Set a real GEMINI_API_KEY from https://aistudio.google.com/apikey. Details: ${detail}`,
          );
        }
        if (status === 404) throw new Error(`Gemini model "${model}" was not found. Check GLY_INTENT_MODEL / GLY_ANSWER_MODEL.`);
        throw new Error(`Could not reach Gemini to check model "${model}": ${detail}`);
      }
    }
  }

  async structured<S extends z.ZodType>(prompt: LlmPrompt, schema: S, timeoutMs: number = 10_000): Promise<z.infer<S> | null> {
    const callPromise = this.ai.models.generateContent({
      model: this.opts.structuredModel,
      contents: prompt.user,
      config: {
        systemInstruction: prompt.system,
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(schema),
        maxOutputTokens: 2048,
      },
    });

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    let res: GenerateContentResponse;
    try {
      res = await Promise.race([callPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (blocked(res) || !res.text) return null;
    try {
      // The caller validates with Zod again; this only turns text into an object.
      return JSON.parse(res.text) as z.infer<S>;
    } catch {
      return null;
    }
  }

  async streamText(prompt: LlmPrompt, onText: (delta: string) => void, timeoutMs: number = 15_000): Promise<string | null> {
    const streamPromise = this.ai.models.generateContentStream({
      model: this.opts.answerModel,
      contents: prompt.user,
      config: { systemInstruction: prompt.system, maxOutputTokens: 8000 },
    });

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini stream timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    let stream: any;
    try {
      stream = await Promise.race([streamPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    let text = "";
    for await (const chunk of stream) {
      if (blocked(chunk)) return text ? text : null;
      const delta = chunk.text;
      if (delta) {
        text += delta;
        onText(delta);
      }
    }
    return text || null;
  }
}

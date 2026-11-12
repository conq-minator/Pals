// Gemini implementation of the shared LLM gateway.
// Needs GEMINI_API_KEY (free key from https://aistudio.google.com/apikey).

import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import type { LlmGateway, LlmPrompt } from "./index.ts";

/**
 * How long one Gemini call may take before GLY gives up and retries. Measured gemini-3.5-flash
 * latency is 1-8 s and occasionally more, so 10 s cut off healthy calls. Override with GLY_LLM_TIMEOUT_MS.
 */
/**
 * Models to try, in order, when the configured one is out of quota or unavailable. Google's free
 * tier allows about 20 requests per model per day, so a few models multiply what a free key can do.
 * Override with GLY_FALLBACK_MODELS (comma-separated; empty string disables fallback).
 */
const FALLBACK_MODELS = (process.env.GLY_FALLBACK_MODELS ?? "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.7-flash,gemini-3.8-flash,gemini-flash-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/** HTTP statuses where another model may work: out of quota, model gone, overloaded. */
const TRY_NEXT = new Set([404, 429, 500, 502, 503]);

const LLM_TIMEOUT_MS = Number(process.env.GLY_LLM_TIMEOUT_MS) > 0 ? Number(process.env.GLY_LLM_TIMEOUT_MS) : 20_000;

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
  /** model -> time (ms) until which it is skipped, after a quota or availability error. */
  private resting = new Map<string, number>();

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

  /** The configured model first, then fallbacks, skipping any still resting after an error. */
  private chain(primary: string): string[] {
    const now = Date.now();
    const all = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
    const ready = all.filter((m) => (this.resting.get(m) ?? 0) <= now);
    return ready.length ? ready : [primary];
  }

  /** Runs `call` on each model in turn until one works or the error isn't model-specific. */
  private async withFallback<T>(primary: string, call: (model: string) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (const model of this.chain(primary)) {
      try {
        return await call(model);
      } catch (err) {
        lastErr = err;
        const status = err instanceof ApiError ? err.status : Number((String(err).match(/"code":\s*(\d{3})/) ?? [])[1] ?? 0);
        if (!TRY_NEXT.has(status)) throw err;
        // Quota errors say how long to wait ("retryDelay":"49588s"); otherwise rest a few minutes.
        const delay = Number((String(err).match(/retryDelay[^0-9]*(\d+)s/) ?? [])[1] ?? 0);
        this.resting.set(model, Date.now() + (status === 429 && delay ? delay * 1000 : 5 * 60_000));
      }
    }
    throw lastErr;
  }

  async structured<S extends z.ZodType>(prompt: LlmPrompt, schema: S, timeoutMs: number = LLM_TIMEOUT_MS): Promise<z.infer<S> | null> {
    return this.withFallback(this.opts.structuredModel, (model) => this.structuredWith(model, prompt, schema, timeoutMs));
  }

  private async structuredWith<S extends z.ZodType>(model: string, prompt: LlmPrompt, schema: S, timeoutMs: number): Promise<z.infer<S> | null> {
    const callPromise = this.ai.models.generateContent({
      model,
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

  async streamText(prompt: LlmPrompt, onText: (delta: string) => void, timeoutMs: number = LLM_TIMEOUT_MS + 10_000): Promise<string | null> {
    // Fallback only covers starting the stream; once text has been shown it isn't restarted.
    const stream = await this.withFallback(this.opts.answerModel, (model) => this.openStream(model, prompt, timeoutMs));
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

  private async openStream(model: string, prompt: LlmPrompt, timeoutMs: number): Promise<any> {
    const streamPromise = this.ai.models.generateContentStream({
      model,
      contents: prompt.user,
      config: { systemInstruction: prompt.system, maxOutputTokens: 8000 },
    });

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini stream timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([streamPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

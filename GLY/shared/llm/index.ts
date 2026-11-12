// Shared LLM gateway. GLY only talks to this interface, never to a provider SDK.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export type LlmPrompt = { system: string; user: string };

export interface LlmGateway {
  /** Returns a schema-valid object, or null when the model could not produce one. */
  structured<S extends z.ZodType>(prompt: LlmPrompt, schema: S): Promise<z.infer<S> | null>;
  /** Streams text through onText and resolves with the full text. Null on refusal. */
  streamText(prompt: LlmPrompt, onText: (delta: string) => void): Promise<string | null>;
  /** Optional start-up check that the key and model names work. Throws a readable error if not. */
  check?(): Promise<void>;
}

export type AnthropicLlmOptions = {
  /** Fast model for routing (ADR-GLY-001). */
  structuredModel: string;
  /** Model for grounded RAG answers. */
  answerModel: string;
};

export class AnthropicLlm implements LlmGateway {
  // Credentials resolve from ANTHROPIC_API_KEY or an `ant auth login` profile.
  private client = new Anthropic();
  private opts: AnthropicLlmOptions;

  constructor(opts: AnthropicLlmOptions) {
    this.opts = opts;
  }

  async check(): Promise<void> {
    for (const model of new Set([this.opts.structuredModel, this.opts.answerModel])) {
      try {
        await this.client.models.retrieve(model);
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude rejected the API key. Set a valid ANTHROPIC_API_KEY.");
        if (err instanceof Anthropic.NotFoundError) throw new Error(`Claude model "${model}" was not found. Check GLY_INTENT_MODEL / GLY_ANSWER_MODEL.`);
        throw new Error(`Could not reach Claude to check model "${model}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async structured<S extends z.ZodType>(prompt: LlmPrompt, schema: S): Promise<z.infer<S> | null> {
    const res = await this.client.messages.parse({
      model: this.opts.structuredModel,
      max_tokens: 2048,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { format: zodOutputFormat(schema), effort: "low" },
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    return (res.parsed_output as z.infer<S> | null) ?? null;
  }

  async streamText(prompt: LlmPrompt, onText: (delta: string) => void): Promise<string | null> {
    // Server-side fallback: if a safety classifier declines on the answer
    // model, the API retries on a suitable model instead of failing.
    const stream = this.client.beta.messages.stream({
      model: this.opts.answerModel,
      max_tokens: 8000,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    let text = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        onText(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") return null;
    return text;
  }
}

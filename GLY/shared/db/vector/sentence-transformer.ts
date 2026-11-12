// Free, local sentence-transformer embeddings via Transformers.js (ONNX).
// No API key and no per-call cost. The model downloads from Hugging Face on
// first use (about 35 MB quantized) and is cached on disk after that.
//
// Default model: BAAI/bge-small-en-v1.5 (MIT licence, 384 dimensions), using
// the ONNX export at Xenova/bge-small-en-v1.5. BGE wants an instruction prefix
// on search queries but not on documents.

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import type { Embedder } from "./index.ts";

export type SentenceTransformerOptions = {
  /** Hugging Face model id with ONNX weights. */
  model?: string;
  dimensions?: number;
  /** Prefix added to queries only (BGE convention). Use "" for models that don't need one. */
  queryPrefix?: string;
  pooling?: "cls" | "mean";
};

export const BGE_SMALL: Required<SentenceTransformerOptions> = {
  model: "Xenova/bge-small-en-v1.5",
  dimensions: 384,
  queryPrefix: "Represent this sentence for searching relevant passages: ",
  pooling: "cls",
};

export class SentenceTransformerEmbedder implements Embedder {
  readonly dimensions: number;
  /** BGE scores unrelated text around 0.3-0.5, so require a clearer match. */
  readonly suggestedScoreMin = 0.6;
  private opts: Required<SentenceTransformerOptions>;
  private extractor: Promise<FeatureExtractionPipeline> | null = null;

  constructor(opts: SentenceTransformerOptions = {}) {
    this.opts = { ...BGE_SMALL, ...opts };
    this.dimensions = this.opts.dimensions;
  }

  private load(): Promise<FeatureExtractionPipeline> {
    // Load once, lazily, and share between calls.
    this.extractor ??= pipeline("feature-extraction", this.opts.model, { dtype: "q8" }) as Promise<FeatureExtractionPipeline>;
    return this.extractor;
  }

  async embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
    if (!texts.length) return [];
    const extractor = await this.load();
    const input = kind === "query" ? texts.map((t) => this.opts.queryPrefix + t) : texts;
    const out: number[][] = [];
    for (let i = 0; i < input.length; i += 16) {
      const tensor = await extractor(input.slice(i, i + 16), { pooling: this.opts.pooling, normalize: true });
      out.push(...(tensor.tolist() as number[][]));
    }
    return out;
  }
}

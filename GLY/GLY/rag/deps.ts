// Picks the vector store and embedder from env, shared by the server and the ingest CLI.
//   DATABASE_URL set      -> Postgres + pgvector, else in-memory cached in .cache/
//   GLY_EMBEDDER          -> "sentence-transformer" (default, free, local),
//                            "voyage" (needs VOYAGE_API_KEY), or "hash" (offline, tests only)
//   GLY_EMBEDDING_MODEL   -> override the Hugging Face model id

import { resolve } from "node:path";
import {
  JsonFileVectorStore,
  LocalHashEmbedder,
  PgVectorStore,
  VoyageEmbedder,
  type Embedder,
  type VectorStore,
} from "../../shared/db/vector/index.ts";
import { SentenceTransformerEmbedder } from "../../shared/db/vector/sentence-transformer.ts";
import type { Logger } from "../../shared/logging/index.ts";

function pickEmbedder(log: Logger): Embedder {
  const kind = process.env.GLY_EMBEDDER ?? "sentence-transformer";
  if (kind === "hash") {
    log.warn("GLY_EMBEDDER=hash: offline word-match embeddings, for tests only");
    return new LocalHashEmbedder();
  }
  if (kind === "voyage") {
    if (!process.env.VOYAGE_API_KEY) throw new Error("GLY_EMBEDDER=voyage needs VOYAGE_API_KEY");
    return new VoyageEmbedder(process.env.VOYAGE_API_KEY);
  }
  const model = process.env.GLY_EMBEDDING_MODEL;
  log.info("using local sentence-transformer embeddings", { model: model ?? "Xenova/bge-small-en-v1.5" });
  return new SentenceTransformerEmbedder(model ? { model } : {});
}

export async function createRagDeps(log: Logger): Promise<{ store: VectorStore; embedder: Embedder; close: () => Promise<void> }> {
  const embedder = pickEmbedder(log);

  if (process.env.DATABASE_URL) {
    const pgStore = new PgVectorStore(process.env.DATABASE_URL, embedder.dimensions);
    await pgStore.init();
    return { store: pgStore, embedder, close: () => pgStore.close() };
  }
  // Cache file is per embedding model, so switching models never mixes vector sizes.
  const model = (process.env.GLY_EMBEDDING_MODEL ?? process.env.GLY_EMBEDDER ?? "bge-small").replace(/[^a-z0-9]+/gi, "-");
  const file = resolve(".cache", `vectors-${model}.json`);
  const store = new JsonFileVectorStore(file);
  const loaded = await store.load();
  log.warn("DATABASE_URL not set: using in-memory vector store cached on disk (dev only)", { file, cachedChunks: loaded });
  return { store, embedder, close: async () => {} };
}

// Vector store adapter + embedders. Stand-in for the team's shared/db/vector.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import pg from "pg";

export type ChunkMeta = {
  sourceUrl: string;
  title: string;
  section: string; // heading path, e.g. "Disputes > Time limits"
  audience: "consumer" | "developer" | "merchant" | "all";
  region: string; // "global", "US", "UK", ...
  topic: string; // fees, disputes, buyer_protection, kyc, api, ...
  docDate: string;
  corpusVersion: string;
};

export type StoredChunk = { id: string; hash: string; text: string; meta: ChunkMeta; embedding: number[] };
export type SearchFilter = Partial<Pick<ChunkMeta, "audience" | "region" | "topic">>;
export type SearchHit = { chunk: Omit<StoredChunk, "embedding">; score: number };

export interface VectorStore {
  upsert(chunks: StoredChunk[]): Promise<void>;
  search(embedding: number[], k: number, filter?: SearchFilter): Promise<SearchHit[]>;
  existingHashes(): Promise<Set<string>>;
  /** Delete every chunk whose id is not in keepIds. Returns how many were removed. */
  pruneExcept(keepIds: Set<string>): Promise<number>;
  /** Optional: write pending changes to durable storage (called at the end of an ingest). */
  flush?(): Promise<void>;
}

export interface Embedder {
  readonly dimensions: number;
  /** A sensible RAG confidence threshold for this embedder's score range. */
  readonly suggestedScoreMin?: number;
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}

// ---------------- In-memory (dev + tests) ----------------

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function matches(meta: ChunkMeta, filter?: SearchFilter): boolean {
  if (!filter) return true;
  if (filter.topic && meta.topic !== filter.topic) return false;
  if (filter.audience && meta.audience !== "all" && meta.audience !== filter.audience) return false;
  if (filter.region && meta.region !== "global" && meta.region !== filter.region) return false;
  return true;
}

export class InMemoryVectorStore implements VectorStore {
  protected rows = new Map<string, StoredChunk>();

  async upsert(chunks: StoredChunk[]) {
    for (const c of chunks) this.rows.set(c.id, c);
  }

  async search(embedding: number[], k: number, filter?: SearchFilter): Promise<SearchHit[]> {
    return [...this.rows.values()]
      .filter((r) => matches(r.meta, filter))
      .map(({ embedding: e, ...chunk }) => ({ chunk, score: cosine(embedding, e) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  async existingHashes() {
    return new Set([...this.rows.values()].map((r) => r.hash));
  }

  async pruneExcept(keepIds: Set<string>) {
    let n = 0;
    for (const id of [...this.rows.keys()]) if (!keepIds.has(id)) { this.rows.delete(id); n++; }
    return n;
  }
}

/**
 * In-memory store that saves to a JSON file, so a restart doesn't re-embed the
 * whole corpus. Dev only: use PgVectorStore in production.
 */
export class JsonFileVectorStore extends InMemoryVectorStore {
  private file: string;

  constructor(file: string) {
    super();
    this.file = file;
  }

  async load(): Promise<number> {
    try {
      const rows = JSON.parse(await readFile(this.file, "utf8")) as StoredChunk[];
      for (const r of rows) this.rows.set(r.id, r);
    } catch {
      // No cache yet, or unreadable: start empty and rebuild.
    }
    return this.rows.size;
  }

  async flush(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp";
    await writeFile(tmp, JSON.stringify([...this.rows.values()]));
    await rename(tmp, this.file);
  }
}

// ---------------- Postgres + pgvector ----------------

export class PgVectorStore implements VectorStore {
  private pool: pg.Pool;
  private dims: number;

  constructor(connectionString: string, dims: number) {
    this.pool = new pg.Pool({ connectionString });
    this.dims = dims;
  }

  async init() {
    await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await this.pool.query(`CREATE TABLE IF NOT EXISTS gly_paypal_chunks (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      text TEXT NOT NULL,
      meta JSONB NOT NULL,
      embedding vector(${this.dims}) NOT NULL
    )`);
    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS gly_paypal_chunks_hnsw ON gly_paypal_chunks USING hnsw (embedding vector_cosine_ops)",
    );
  }

  async upsert(chunks: StoredChunk[]) {
    for (const c of chunks) {
      await this.pool.query(
        `INSERT INTO gly_paypal_chunks (id, hash, text, meta, embedding) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET hash=EXCLUDED.hash, text=EXCLUDED.text, meta=EXCLUDED.meta, embedding=EXCLUDED.embedding`,
        [c.id, c.hash, c.text, c.meta, `[${c.embedding.join(",")}]`],
      );
    }
  }

  async search(embedding: number[], k: number, filter?: SearchFilter): Promise<SearchHit[]> {
    const where: string[] = [];
    const params: unknown[] = [`[${embedding.join(",")}]`, k];
    if (filter?.topic) { params.push(filter.topic); where.push(`meta->>'topic' = $${params.length}`); }
    if (filter?.audience) { params.push(filter.audience); where.push(`meta->>'audience' IN ($${params.length}, 'all')`); }
    if (filter?.region) { params.push(filter.region); where.push(`meta->>'region' IN ($${params.length}, 'global')`); }
    const sql = `SELECT id, hash, text, meta, 1 - (embedding <=> $1::vector) AS score
                 FROM gly_paypal_chunks ${where.length ? "WHERE " + where.join(" AND ") : ""}
                 ORDER BY embedding <=> $1::vector LIMIT $2`;
    const { rows } = await this.pool.query(sql, params);
    return rows.map((r) => ({ chunk: { id: r.id, hash: r.hash, text: r.text, meta: r.meta }, score: Number(r.score) }));
  }

  async existingHashes() {
    const { rows } = await this.pool.query("SELECT hash FROM gly_paypal_chunks");
    return new Set(rows.map((r) => r.hash as string));
  }

  async pruneExcept(keepIds: Set<string>) {
    const res = await this.pool.query("DELETE FROM gly_paypal_chunks WHERE NOT (id = ANY($1))", [[...keepIds]]);
    return res.rowCount ?? 0;
  }

  async close() {
    await this.pool.end();
  }
}

// ---------------- Embedders ----------------

/**
 * Voyage AI embeddings (Anthropic's recommended embeddings partner).
 * Needs VOYAGE_API_KEY. Uses the REST endpoint directly.
 */
export class VoyageEmbedder implements Embedder {
  readonly dimensions = 1024;
  readonly suggestedScoreMin = 0.5;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "voyage-3.5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, input: texts.slice(i, i + 64), input_type: kind }),
      });
      if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
      const body = (await res.json()) as { data: { embedding: number[] }[] };
      out.push(...body.data.map((d) => d.embedding));
    }
    return out;
  }
}

/**
 * Offline hashed bag-of-words embedder. Only for local dev and tests:
 * it matches on shared words, not meaning.
 */
export class LocalHashEmbedder implements Embedder {
  readonly dimensions = 512;
  readonly suggestedScoreMin = 0.35;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const v = new Array<number>(this.dimensions).fill(0);
      for (const w of t.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
        if (w.length < 3 || STOP.has(w)) continue;
        let h = 2166136261;
        for (let i = 0; i < w.length; i++) h = Math.imul(h ^ w.charCodeAt(i), 16777619);
        const idx = (h >>> 0) % this.dimensions;
        v[idx] = (v[idx] ?? 0) + 1;
      }
      return v;
    });
  }
}

const STOP = new Set(
  "the and for you your are can how what with this that from have has not but was will when who does into about".split(" "),
);

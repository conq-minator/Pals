// P3 steps 4-6: tag, skip unchanged, embed, upsert, prune.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Embedder, StoredChunk, VectorStore } from "../../../shared/db/vector/index.ts";
import type { Logger } from "../../../shared/logging/index.ts";
import { chunkMarkdown } from "./chunk.ts";
import { cleanMarkdown, parseFrontMatter } from "./clean.ts";

export type IngestReport = { files: number; chunks: number; embedded: number; skipped: number; pruned: number; errors: string[] };

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

async function listMarkdown(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listMarkdown(p)));
    else if (entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") out.push(p);
  }
  return out.sort();
}

export async function ingestCorpus(opts: {
  dir: string;
  store: VectorStore;
  embedder: Embedder;
  corpusVersion: string;
  log: Logger;
}): Promise<IngestReport> {
  const { dir, store, embedder, corpusVersion, log } = opts;
  const report: IngestReport = { files: 0, chunks: 0, embedded: 0, skipped: 0, pruned: 0, errors: [] };
  const existing = await store.existingHashes();
  const keepIds = new Set<string>();
  const fresh: Omit<StoredChunk, "embedding">[] = [];

  for (const file of await listMarkdown(dir)) {
    try {
      const { header, body } = parseFrontMatter(await readFile(file, "utf8"), file);
      const chunks = chunkMarkdown(cleanMarkdown(body), header.title);
      report.files++;
      for (const c of chunks) {
        // The text we embed carries its heading path so search sees the context.
        const text = `${header.title} > ${c.section}\n\n${c.body}`;
        const id = sha1(`${header.sourceUrl}#${c.index}`);
        const hash = sha1(text);
        keepIds.add(id);
        report.chunks++;
        if (existing.has(hash)) { report.skipped++; continue; }
        fresh.push({ id, hash, text, meta: { ...header, section: c.section, corpusVersion } });
      }
    } catch (err) {
      report.errors.push(String(err));
      log.error("ingest file failed", { file, error: String(err) });
    }
  }

  for (let i = 0; i < fresh.length; i += 32) {
    const batch = fresh.slice(i, i + 32);
    const vectors = await embedder.embed(batch.map((c) => c.text), "document");
    await store.upsert(batch.map((c, j) => ({ ...c, embedding: vectors[j]! })));
    report.embedded += batch.length;
  }

  // Only prune when every file parsed, so one bad file can't wipe good chunks.
  if (!report.errors.length) report.pruned = await store.pruneExcept(keepIds);
  if (report.embedded || report.pruned) await store.flush?.();
  log.info("ingest finished", { ...report, errors: report.errors.length });
  return report;
}

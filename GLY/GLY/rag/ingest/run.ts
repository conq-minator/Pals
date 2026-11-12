// CLI: npm run ingest [-- <dir>]
// Loads docs/knowledge/paypal/ into the vector store. Needs DATABASE_URL to persist.

import { resolve } from "node:path";
import { createLogger } from "../../../shared/logging/index.ts";
import { createRagDeps } from "../deps.ts";
import { ingestCorpus } from "./ingest.ts";

const log = createLogger("GLY.ingest");
const dir = resolve(process.argv[2] ?? "docs/knowledge/paypal");
const corpusVersion = new Date().toISOString().slice(0, 10);

const deps = await createRagDeps(log);
try {
  const report = await ingestCorpus({ dir, store: deps.store, embedder: deps.embedder, corpusVersion, log });
  console.log(
    `\nIngested ${report.files} files -> ${report.chunks} chunks ` +
      `(${report.embedded} embedded, ${report.skipped} unchanged, ${report.pruned} removed).`,
  );
  if (report.errors.length) {
    console.error(`${report.errors.length} file(s) failed; nothing was pruned:\n  ${report.errors.join("\n  ")}`);
    process.exitCode = 1;
  }
} finally {
  await deps.close();
}

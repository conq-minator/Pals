// Entry point: npm start
// Runs GLY with the demo calls/ (fake ARB + PULSE) until the real gateway exists.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { FakeCalls } from "../calls/index.ts";
import { createLogger } from "../shared/logging/index.ts";
import { InMemoryTaskBus } from "../shared/tasks/index.ts";
import { GlyService } from "./chat/handler.ts";
import { attachChatSocket } from "./chat/socket.ts";
import { loadConfig } from "./config.ts";
import { createLlm } from "./llm.ts";
import { createRagDeps } from "./rag/deps.ts";
import { ingestCorpus } from "./rag/ingest/ingest.ts";

const log = createLogger("GLY");
const config = loadConfig();
const rag = await createRagDeps(log);

// With the in-memory store, load the corpus at boot. With pgvector, run `npm run ingest` instead.
if (!process.env.DATABASE_URL) {
  await ingestCorpus({ dir: resolve("docs/knowledge/paypal"), ...rag, corpusVersion: "boot", log });
}

const bus = new InMemoryTaskBus();
const gly = new GlyService({
  config,
  llm: createLlm(config),
  rag,
  calls: new FakeCalls(bus, { workMs: Number(process.env.GLY_FAKE_WORK_MS ?? 4000) }),
  bus,
  log,
});
gly.start();

const demoPage = resolve("GLY/demo/index.html");
const server = createServer(async (req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === "/" || req.url?.startsWith("/?")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(await readFile(demoPage));
    return;
  }
  res.writeHead(404).end();
});
attachChatSocket(server, gly, log);

server.listen(config.port, () => {
  log.info("GLY listening", { url: `http://localhost:${config.port}`, provider: config.llmProvider, intentModel: config.intentModel, answerModel: config.answerModel });
});

const shutdown = async () => {
  gly.stop();
  server.close();
  await rag.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

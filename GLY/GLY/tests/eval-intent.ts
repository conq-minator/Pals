// npm run eval:intent
// Runs the labelled set in intent.eval.json through the REAL intent model and
// reports accuracy. This calls the real LLM API (about 32 small requests).
// Single-message examples only; add history to rows when you need context cases.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createLogger } from "../../shared/logging/index.ts";
import { loadConfig } from "../config.ts";
import { classifyIntent } from "../intent/classify.ts";
import { createLlm } from "../llm.ts";
import type { Intent } from "../intent/schema.ts";

process.env.LOG_LEVEL ??= "warn";
const config = loadConfig();
const llm = createLlm(config);
const rows = JSON.parse(await readFile(resolve(import.meta.dirname, "intent.eval.json"), "utf8")) as { text: string; intent: Intent }[];

let correct = 0;
const misses: string[] = [];
let paymentMisreads = 0;

for (const [i, row] of rows.entries()) {
  const r = await classifyIntent(
    llm,
    { messageId: `e${i}`, sessionId: "eval", userId: "eval", text: row.text, receivedAt: new Date().toISOString(), correlationId: `eval-${i}`, history: [], recentTasks: [] },
    createLogger("eval"),
  );
  if (r.intent === row.intent) correct++;
  else {
    misses.push(`  "${row.text}"  expected ${row.intent}, got ${r.intent} (${r.confidence.toFixed(2)})`);
    if (r.intent === "payment_request" || row.intent === "payment_request") paymentMisreads++;
  }
}

const pct = (100 * correct) / rows.length;
console.log(`\nIntent accuracy: ${correct}/${rows.length} = ${pct.toFixed(1)}%  (model ${config.intentModel})`);
console.log(`Payment-related misreads: ${paymentMisreads}`);
if (misses.length) console.log(`Misses:\n${misses.join("\n")}`);
process.exitCode = pct >= 95 ? 0 : 1;

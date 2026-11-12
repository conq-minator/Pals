import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import { InMemoryVectorStore, LocalHashEmbedder } from "../../shared/db/vector/index.ts";
import { notFoundText } from "../rag/answer.ts";
import { chunkMarkdown, estimateTokens } from "../rag/ingest/chunk.ts";
import { cleanMarkdown, parseFrontMatter } from "../rag/ingest/clean.ts";
import { ingestCorpus } from "../rag/ingest/ingest.ts";
import { connect, FakeLlm, intent, log, makeGly, waitFor } from "./helpers.ts";

const CORPUS = resolve(import.meta.dirname, "fixtures/corpus");

describe("P3 clean + chunk", () => {
  it("parses front matter and rejects files without it", () => {
    const { header } = parseFrontMatter("---\nsource: https://x.test\ntitle: T\naudience: developer\nregion: uk\ntopic: api\ndocDate: 2026-01-01\n---\nbody", "a.md");
    assert.deepEqual(header, { sourceUrl: "https://x.test", title: "T", audience: "developer", region: "UK", topic: "api", docDate: "2026-01-01" });
    assert.throws(() => parseFrontMatter("no header", "b.md"), /missing front matter/);
    assert.throws(() => parseFrontMatter("---\nsource: s\ntitle: t\naudience: robots\nregion: US\ntopic: x\ndocDate: d\n---\n", "c.md"), /audience/);
  });

  it("strips cookie banners, nav and images", () => {
    const out = cleanMarkdown("Skip to main content\n![logo](x.png)\nReal text\nWe use cookies to track you.\n");
    assert.equal(out, "Real text");
  });

  it("keeps the heading path and never splits a list or table", () => {
    const md = "# Doc\n\n## A\n\nintro\n\n1. one\n\n2. two\n\n| a | b |\n| - | - |\n| 1 | 2 |\n";
    const chunks = chunkMarkdown(md, "Doc", { maxTokens: 6, overlapTokens: 0 });
    assert.ok(chunks.every((c) => c.section === "Doc > A"));
    assert.ok(chunks.some((c) => c.body.includes("1. one\n2. two")), "numbered list stays together");
    assert.ok(chunks.some((c) => c.body.includes("| a | b |\n| - | - |\n| 1 | 2 |")), "table stays together");
  });

  it("splits long plain text into chunks under the limit", () => {
    const para = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkMarkdown(`## Long\n\n${para}`, "Doc", { maxTokens: 80, overlapTokens: 0 });
    assert.ok(chunks.length > 2);
    assert.ok(chunks.every((c) => estimateTokens(c.body) <= 80));
  });
});

describe("P3 ingest", () => {
  it("embeds new chunks, skips unchanged ones on re-run", async () => {
    const store = new InMemoryVectorStore();
    const embedder = new LocalHashEmbedder();
    const first = await ingestCorpus({ dir: CORPUS, store, embedder, corpusVersion: "v1", log });
    assert.equal(first.files, 2);
    assert.ok(first.embedded > 0);
    assert.equal(first.errors.length, 0);
    const second = await ingestCorpus({ dir: CORPUS, store, embedder, corpusVersion: "v1", log });
    assert.equal(second.embedded, 0);
    assert.equal(second.skipped, first.chunks);
  });

  it("does not prune anything when a file is broken", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gly-"));
    await writeFile(join(dir, "good.md"), "---\nsource: https://g.test\ntitle: G\naudience: all\nregion: global\ntopic: other\ndocDate: 2026-01-01\n---\n## S\n\ntext here");
    const store = new InMemoryVectorStore();
    const embedder = new LocalHashEmbedder();
    await ingestCorpus({ dir, store, embedder, corpusVersion: "v1", log });
    await writeFile(join(dir, "good.md"), "broken now");
    const r = await ingestCorpus({ dir, store, embedder, corpusVersion: "v2", log });
    assert.equal(r.errors.length, 1);
    assert.equal(r.pruned, 0);
    assert.equal((await store.existingHashes()).size, 1);
  });
});

describe("P4 RAG answer", () => {
  async function setup(answer: string | null = "Buyers have 90 days [1].") {
    const llm = new FakeLlm(() => intent({ intent: "paypal_guidance", standaloneQuestion: "How many days do I have to open a dispute in the resolution centre?", entities: { paypalTopic: "disputes" } }), answer);
    const t = makeGly({ llm });
    await ingestCorpus({ dir: CORPUS, ...t.rag, corpusVersion: "v1", log });
    return { ...t, c: connect(t.gly) };
  }

  it("streams a grounded answer with the cited source", async () => {
    const { gly, llm, c } = await setup();
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "how long for disputes?" });
    const tokens = c.events.filter((e) => e.type === "token").map((e) => (e as { text: string }).text).join("");
    assert.equal(tokens, "Buyers have 90 days [1].");
    const end = c.events.find((e) => e.type === "stream_end") as { sources: { n: number; url: string }[] };
    assert.equal(end.sources.length, 1);
    assert.equal(end.sources[0]!.url, "https://docs.example.test/examplepay/disputes");
    assert.match(llm.streamCalls[0]!.user, /<source n="1"/);
  });

  it("says 'not found' instead of guessing when nothing matches", async () => {
    const { gly, llm, c, config } = await setup();
    llm.classifyFn = () => intent({ intent: "paypal_guidance", standaloneQuestion: "Can I pay for groceries with zebras?" });
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "zebra payments?" });
    assert.deepEqual(c.messages(), [notFoundText(config.paypalHelpUrl)]);
    assert.equal(llm.streamCalls.length, 0, "the LLM is not asked to answer without sources");
  });

  it("falls back politely when the answer model refuses", async () => {
    const { gly, c } = await setup(null);
    await gly.handleUserMessage({ sessionId: c.sessionId, userId: c.userId, text: "how long for disputes?" });
    await waitFor(() => c.messages().length === 1);
    assert.match(c.messages()[0]!, /couldn't put an answer together/);
  });
});

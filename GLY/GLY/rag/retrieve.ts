// P4 steps 2-3: search the PayPal corpus and decide if we are confident enough to answer.

import type { Embedder, SearchFilter, SearchHit, VectorStore } from "../../shared/db/vector/index.ts";

export type Retrieval = { hits: SearchHit[]; bestScore: number; confident: boolean };

export async function retrieve(
  deps: { store: VectorStore; embedder: Embedder },
  question: string,
  opts: { filter: SearchFilter; topic: string | null; topK: number; scoreMin: number },
): Promise<Retrieval> {
  const [vec] = await deps.embedder.embed([question], "query");
  if (!vec) return { hits: [], bestScore: 0, confident: false };

  let hits = await deps.store.search(vec, opts.topK, opts.filter);
  // If the filters were too narrow, try once without them.
  if (!hits.length && Object.keys(opts.filter).length) hits = await deps.store.search(vec, opts.topK);

  // Small boost for the topic the classifier detected; it re-ranks, never filters.
  // The PALS app guide only leads when the question is about the app: for PayPal questions it
  // is pushed down, so PayPal's own docs answer "how do I pay with PayPal?".
  // Developer pages likewise only lead for API questions, so shoppers get shopper answers.
  const devQuestion = opts.topic === "api" || opts.filter.audience === "developer";
  const adjust = (meta: { topic: string; audience: string }) =>
    (opts.topic && meta.topic === opts.topic ? 0.03 : 0) +
    (meta.topic === "pals_app" && opts.topic !== "pals_app" ? -0.08 : 0) +
    (meta.audience === "developer" && !devQuestion ? -0.05 : 0);
  const ranked = hits
    .map((h) => ({ ...h, score: h.score + adjust(h.chunk.meta) }))
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0]?.score ?? 0;
  const confident = bestScore >= opts.scoreMin;
  // Keep only chunks reasonably close to the best one, max 5.
  const kept = ranked.filter((h) => h.score >= Math.max(opts.scoreMin * 0.8, bestScore - 0.25)).slice(0, 5);
  return { hits: kept, bestScore, confident };
}

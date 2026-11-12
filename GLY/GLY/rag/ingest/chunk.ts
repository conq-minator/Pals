// P3 step 3: split a cleaned doc into heading-aware chunks.
// Tables and lists are never cut in half.

export type RawChunk = { section: string; body: string; index: number };

export type ChunkOptions = { maxTokens: number; overlapTokens: number };
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxTokens: 700, overlapTokens: 100 };

/** Rough token estimate (~1.33 tokens per word). Good enough for sizing chunks. */
export function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.33);
}

type Block = { text: string; atomic: boolean };

const isTableLine = (l: string) => /^\s*\|/.test(l);
const isListLine = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l);

/** Splits section text into blocks. Consecutive list items and table rows stay together. */
function toBlocks(text: string): Block[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const blocks: Block[] = [];
  for (const p of paras) {
    const lines = p.split("\n");
    const atomic = lines.every((l) => isTableLine(l)) || isListLine(lines[0] ?? "");
    const prev = blocks[blocks.length - 1];
    // A numbered list broken by blank lines is still one list.
    if (prev && prev.atomic && atomic && isListLine(lines[0] ?? "") && isListLine(prev.text.split("\n")[0] ?? "")) {
      prev.text += "\n" + p;
    } else {
      blocks.push({ text: p, atomic });
    }
  }
  return blocks;
}

/** Splits an over-long plain paragraph on sentence ends. Atomic blocks are returned whole. */
function splitLong(block: Block, max: number): Block[] {
  if (block.atomic || estimateTokens(block.text) <= max) return [block];
  const sentences = block.text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [block.text];
  const out: Block[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && estimateTokens(cur + s) > max) { out.push({ text: cur.trim(), atomic: false }); cur = ""; }
    cur += s;
  }
  if (cur.trim()) out.push({ text: cur.trim(), atomic: false });
  return out;
}

/** Turns markdown into sections keyed by their heading path ("Disputes > Time limits"). */
function toSections(md: string, docTitle: string): { path: string; text: string }[] {
  const sections: { path: string; text: string }[] = [];
  const stack: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) sections.push({ path: stack.filter(Boolean).join(" > ") || docTitle, text });
    buf = [];
  };
  for (const line of md.split("\n")) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const level = (h[1] ?? "#").length;
      stack.length = level - 1;
      stack[level - 1] = (h[2] ?? "").trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

export function chunkMarkdown(md: string, docTitle: string, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): RawChunk[] {
  const chunks: RawChunk[] = [];
  for (const sec of toSections(md, docTitle)) {
    const blocks = toBlocks(sec.text).flatMap((b) => splitLong(b, opts.maxTokens));
    let cur: Block[] = [];
    const emit = () => {
      if (!cur.length) return;
      chunks.push({ section: sec.path, body: cur.map((b) => b.text).join("\n\n"), index: chunks.length });
      // Overlap: carry the last block forward if it is small enough.
      const last = cur[cur.length - 1]!;
      cur = !last.atomic && estimateTokens(last.text) <= opts.overlapTokens ? [last] : [];
    };
    for (const b of blocks) {
      const size = estimateTokens(cur.map((x) => x.text).join("\n\n") + "\n\n" + b.text);
      if (cur.length && size > opts.maxTokens) emit();
      cur.push(b);
    }
    // Drop a trailing chunk that is only the overlap carry-over.
    const onlyCarry = cur.length === 1 && chunks.length && chunks[chunks.length - 1]!.body.endsWith(cur[0]!.text);
    if (!onlyCarry) emit();
  }
  return chunks.map((c, i) => ({ ...c, index: i }));
}

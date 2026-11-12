// P3 steps 1-2: read a saved doc's header and strip page junk.

import type { ChunkMeta } from "../../../shared/db/vector/index.ts";

export type DocHeader = Omit<ChunkMeta, "section" | "corpusVersion">;

const AUDIENCES = new Set(["consumer", "developer", "merchant", "all"]);

/** Parses the `---` front matter every file in docs/knowledge/paypal/ must start with. */
export function parseFrontMatter(raw: string, fileName: string): { header: DocHeader; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${fileName}: missing front matter (source, title, audience, region, topic, docDate)`);
  const fields: Record<string, string> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z]+)\s*:\s*(.*)\s*$/);
    if (kv && kv[1]) fields[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  const need = ["source", "title", "audience", "region", "topic", "docDate"];
  const missing = need.filter((k) => !fields[k]);
  if (missing.length) throw new Error(`${fileName}: front matter missing ${missing.join(", ")}`);
  if (!AUDIENCES.has(fields.audience!)) throw new Error(`${fileName}: audience must be one of ${[...AUDIENCES].join(", ")}`);

  return {
    header: {
      sourceUrl: fields.source!,
      title: fields.title!,
      audience: fields.audience as DocHeader["audience"],
      region: fields.region!.toUpperCase() === "GLOBAL" ? "global" : fields.region!.toUpperCase(),
      topic: fields.topic!,
      docDate: fields.docDate!,
    },
    body: m[2] ?? "",
  };
}

const JUNK = [
  /^\s*skip to (main )?content\s*$/i,
  /^\s*(accept|reject|manage) (all )?cookies.*$/i,
  /^\s*we use cookies.*$/i,
  /^\s*was this (article|page) helpful\??.*$/i,
  /^\s*(back to top|sign up|log in|share this)\s*$/i,
  /^\s*©.*paypal.*$/i,
];

/** Removes navigation, cookie banners, images and stray HTML; keeps headings, lists and tables. */
export function cleanMarkdown(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/<\/?(div|span|section|nav|footer|header|br|p)[^>]*>/gi, "\n")
    .split(/\r?\n/)
    .filter((line) => !JUNK.some((re) => re.test(line)))
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

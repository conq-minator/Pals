// npm run fetch:paypal
//
// Builds the PayPal knowledge corpus in docs/knowledge/paypal/ from two official sources:
//   1. PayPal's OpenAPI specs (github.com/paypal/paypal-rest-api-specifications, Apache-2.0)
//      -> api-reference/*.md, one file per API: operations, parameters, responses, schemas.
//   2. Developer guide pages listed in developer.paypal.com/sitemap.xml, limited to the
//      sections in INCLUDE below and filtered by robots.txt -> developer-guides/*.md
//
// This is offline tooling for P3, not part of GLY's runtime. Re-run it to refresh the corpus,
// then restart the server (in-memory store) or run `npm run ingest` (Postgres).
//
// Options:  --specs-only   --guides-only   --max-pages=N (default 120)   --delay-ms=N (default 600)

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";

const OUT = resolve("docs/knowledge/paypal");
const UA = "gly-docs-ingest/0.1 (+offline corpus build)";
const TODAY = new Date().toISOString().slice(0, 10);

const args = new Map<string, string | undefined>(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k ?? "", v];
  }),
);
const MAX_PAGES = Number(args.get("max-pages") ?? 120);
const DELAY_MS = Number(args.get("delay-ms") ?? 600);

// ---------------------------------------------------------------- sources

const SPEC_REPO = "paypal/paypal-rest-api-specifications";
const SPEC_BRANCH = "main";

/** Sitemap path prefixes to fetch. Edit this list to widen or narrow the corpus. */
const INCLUDE = [
  "/api/rest/", // REST basics: auth, requests, responses, idempotency, rate limits, errors, webhooks
  "/api/disputes",
  "/disputes/",
  "/platforms/disputes/",
  "/sandbox-testing/",
];

/** Pages the user listed explicitly. Always fetched (if robots.txt allows). */
const SEEDS = [
  "https://developer.paypal.com/docs/",
  "https://developer.paypal.com/api/rest/",
  "https://developer.paypal.com/tools/sandbox/",
  "https://developer.paypal.com/api/rest/webhooks/",
  "https://developer.paypal.com/api/rest/webhooks/event-names/",
  "https://developer.paypal.com/docs/api/customer-disputes/v1/",
];

// ---------------------------------------------------------------- helpers

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    if (res.status < 500 || attempt === 2) return res;
    await sleep(2000);
  }
}

function topicFor(text: string): string {
  if (/dispute/i.test(text)) return "disputes";
  if (/refund/i.test(text)) return "refunds";
  if (/payout|payment|order|checkout|capture|invoic|subscri|billing|vault|transaction/i.test(text)) return "payments";
  return "api";
}

function frontMatter(f: { source: string; title: string; topic: string }): string {
  const title = f.title.replace(/"/g, "'");
  return `---\nsource: ${f.source}\ntitle: "${title}"\naudience: developer\nregion: global\ntopic: ${f.topic}\ndocDate: ${TODAY}\n---\n\n`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/^https?:\/\/[^/]+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "index";
}

/** OpenAPI descriptions contain small bits of HTML. Reduce them to plain Markdown-ish text. */
function plain(html: string | undefined, max = 0): string {
  if (!html) return "";
  let s = html
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<a [^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|ul|ol)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
  if (max && s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, "") + " …";
  return s;
}

async function clearDir(dir: string) {
  await mkdir(dir, { recursive: true });
  for (const f of await readdir(dir)) if (f.endsWith(".md")) await rm(join(dir, f));
}

// ---------------------------------------------------------------- 1. OpenAPI specs

type Json = Record<string, any>;

const refName = (ref: string | undefined) => (ref ? ref.split("/").pop()! : "");

function schemaType(s: Json | undefined): string {
  if (!s) return "";
  if (s.$ref) return refName(s.$ref);
  if (s.type === "array") return `array of ${schemaType(s.items)}`;
  if (s.allOf) return s.allOf.map(schemaType).filter(Boolean).join(" + ");
  if (s.oneOf || s.anyOf) return (s.oneOf ?? s.anyOf).map(schemaType).filter(Boolean).join(" | ");
  return s.type ?? "object";
}

function specToMarkdown(spec: Json, file: string): string {
  const out: string[] = [];
  const title = spec.info?.title ?? file;
  out.push(`# ${title} (version ${spec.info?.version ?? "?"})`, "", plain(spec.info?.description), "");

  const servers = (spec.servers ?? []).map((s: Json) => `- ${s.description ?? "server"}: ${s.url}`);
  if (servers.length) out.push("## Servers", "", ...servers, "");

  out.push("## Operations", "");
  for (const [path, item] of Object.entries<Json>(spec.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const op = item[method];
      if (!op) continue;
      out.push(`### ${op.summary ?? `${method.toUpperCase()} ${path}`}`, "", `\`${method.toUpperCase()} ${path}\``, "");
      if (op.description) out.push(plain(op.description, 2000), "");
      const params = [...(item.parameters ?? []), ...(op.parameters ?? [])]
        .map((p: Json) => (p.$ref ? spec.components?.parameters?.[refName(p.$ref)] ?? { name: refName(p.$ref) } : p))
        .map((p: Json) => `- \`${p.name}\` (${p.in ?? "?"}${p.required ? ", required" : ""}): ${plain(p.description, 300)}`);
      if (params.length) out.push("Parameters:", "", ...params, "");
      const body = op.requestBody?.content?.["application/json"]?.schema;
      if (body) out.push(`Request body: ${schemaType(body)}`, "");
      const responses = Object.entries<Json>(op.responses ?? {}).map(([code, r]) => {
        const resolved = r.$ref ? spec.components?.responses?.[refName(r.$ref)] ?? {} : r;
        return `- ${code}: ${plain(resolved.description, 300) || refName(r.$ref)}`;
      });
      if (responses.length) out.push("Responses:", "", ...responses, "");
    }
  }

  const schemas = Object.entries<Json>(spec.components?.schemas ?? {});
  if (schemas.length) out.push("## Schemas", "");
  for (const [name, s] of schemas) {
    out.push(`### ${name}`, "");
    if (s.description) out.push(plain(s.description, 1200), "");
    if (s.enum) out.push(`Allowed values: ${s.enum.slice(0, 40).map((v: unknown) => `\`${v}\``).join(", ")}`, "");
    const props = Object.entries<Json>(s.properties ?? {});
    const required = new Set<string>(s.required ?? []);
    if (props.length) {
      out.push(
        ...props.map(([p, ps]) => {
          const enumPart = ps.enum ? ` Values: ${ps.enum.slice(0, 15).join(", ")}.` : "";
          return `- \`${p}\` (${schemaType(ps)}${required.has(p) ? ", required" : ""}): ${plain(ps.description, 400)}${enumPart}`;
        }),
        "",
      );
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

async function fetchSpecs(): Promise<number> {
  const dir = join(OUT, "api-reference");
  await clearDir(dir);
  const tree = (await (await get(`https://api.github.com/repos/${SPEC_REPO}/git/trees/${SPEC_BRANCH}?recursive=1`)).json()) as Json;
  const files: string[] = (tree.tree ?? [])
    .filter((t: Json) => t.type === "blob" && /^openapi\/.+\.json$/.test(t.path))
    .map((t: Json) => t.path);
  if (!files.length) throw new Error("No OpenAPI files found in the spec repo (GitHub rate limit?)");

  for (const path of files) {
    const raw = `https://raw.githubusercontent.com/${SPEC_REPO}/${SPEC_BRANCH}/${path}`;
    const res = await get(raw);
    if (!res.ok) { console.warn(`  skip ${path}: HTTP ${res.status}`); continue; }
    const spec = (await res.json()) as Json; // parsed as data only, never executed
    const name = path.replace(/^openapi\//, "").replace(/\.json$/, "");
    const title = `PayPal ${spec.info?.title ?? name} API reference`;
    const md = frontMatter({ source: `https://github.com/${SPEC_REPO}/blob/${SPEC_BRANCH}/${path}`, title, topic: topicFor(name) }) + specToMarkdown(spec, name);
    await writeFile(join(dir, `${slug(name)}.md`), md);
    console.log(`  spec  ${name}  (${Math.round(md.length / 1024)} KB)`);
  }
  return files.length;
}

// ---------------------------------------------------------------- 2. developer guide pages

async function robotsDisallow(): Promise<string[]> {
  const txt = await (await get("https://developer.paypal.com/robots.txt")).text();
  const rules: string[] = [];
  let applies = false;
  for (const line of txt.split(/\r?\n/)) {
    const [k, ...v] = line.split(":");
    const key = k?.trim().toLowerCase();
    const val = v.join(":").trim();
    if (key === "user-agent") applies = val === "*";
    else if (applies && key === "disallow" && val) rules.push(val);
  }
  return rules;
}

function allowed(path: string, rules: string[]): boolean {
  return !rules.some((r) => {
    const re = new RegExp("^" + r.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
    return re.test(path);
  });
}

function makeTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  td.use(tables);
  td.remove(["script", "style", "noscript", "svg", "button", "form", "nav", "aside", "footer", "iframe"] as any);
  // Keep link text, drop URLs: they add noise to embeddings.
  td.addRule("plainLinks", { filter: "a", replacement: (content) => content });
  td.addRule("noImages", { filter: "img", replacement: () => "" });
  return td;
}

function extractMain(html: string): { title: string; body: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "PayPal Developer")
    .replace(/\s*\|\s*PayPal Developer\s*$/i, "")
    .replace(/&amp;/g, "&")
    .trim();
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf("</main>");
  const body = start >= 0 && end > start ? html.slice(start, end + 7) : html;
  return { title, body };
}

/** Lines that are site UI, not documentation. */
const CHROME = [
  /^#{0,6}\s*On this page\s*$/i,
  /^#{0,6}\s*.*\bcookies?\b.*$/i,
  /^View as Markdown$/i,
  /^Copy \/ Export$/i,
  /^\*\*Estimated time:\*\*/i,
  /^(Feedback|Was this (page|article) helpful\??)$/i,
];

function stripSiteChrome(md: string): string {
  return md
    .split("\n")
    .filter((line) => !CHROME.some((re) => re.test(line.trim())))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchGuides(): Promise<number> {
  const dir = join(OUT, "developer-guides");
  await clearDir(dir);
  const rules = await robotsDisallow();

  const sitemap = await (await get("https://developer.paypal.com/sitemap.xml")).text();
  const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1]!.trim())
    .filter((u) => INCLUDE.some((p) => new URL(u).pathname.startsWith(p)));

  const seen = new Set<string>();
  const queue = [...SEEDS, ...fromSitemap].filter((u) => {
    const key = new URL(u).pathname.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const td = makeTurndown();
  let saved = 0;
  const written = new Set<string>();
  for (const url of queue.slice(0, MAX_PAGES)) {
    const path = new URL(url).pathname;
    if (!allowed(path, rules)) { console.log(`  robots  skip ${path}`); continue; }
    await sleep(DELAY_MS);
    const res = await get(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) {
      console.warn(`  skip ${path}: HTTP ${res.status}`);
      continue;
    }
    const finalUrl = res.url || url;
    const { title, body } = extractMain(await res.text());
    const md = stripSiteChrome(td.turndown(body));
    if (md.length < 300) { console.log(`  thin   skip ${path} (${md.length} chars)`); continue; }

    const name = slug(new URL(finalUrl).pathname);
    if (written.has(name)) continue; // two URLs redirected to the same page
    written.add(name);
    const doc = frontMatter({ source: finalUrl, title: `${title} (PayPal Developer)`, topic: topicFor(path + " " + title) }) + `# ${title}\n\n${md}\n`;
    await writeFile(join(dir, `${name}.md`), doc);
    saved++;
    console.log(`  page  ${path}  (${Math.round(doc.length / 1024)} KB)`);
  }
  if (queue.length > MAX_PAGES) console.log(`  (stopped at --max-pages=${MAX_PAGES}; ${queue.length - MAX_PAGES} more matched)`);
  return saved;
}

// ---------------------------------------------------------------- main

const onlySpecs = args.has("specs-only");
const onlyGuides = args.has("guides-only");
// Keep the other half's count when only one half is refreshed.
const summary: Record<string, number> = await readFile(join(OUT, "sources.json"), "utf8")
  .then((t) => (JSON.parse(t).counts ?? {}) as Record<string, number>)
  .catch(() => ({}));

if (!onlyGuides) {
  console.log("Fetching PayPal OpenAPI specs…");
  summary.specs = await fetchSpecs();
}
if (!onlySpecs) {
  console.log("Fetching PayPal developer guide pages…");
  summary.guides = await fetchGuides();
}

await writeFile(
  join(OUT, "sources.json"),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      specs: `https://github.com/${SPEC_REPO} (Apache-2.0)`,
      guides: { sitemap: "https://developer.paypal.com/sitemap.xml", include: INCLUDE, seeds: SEEDS },
      counts: summary,
    },
    null,
    2,
  ) + "\n",
);
console.log(`\nDone: ${JSON.stringify(summary)}. Next: restart the server, or run \`npm run ingest\` with DATABASE_URL.`);

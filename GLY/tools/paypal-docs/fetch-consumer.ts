// npm run fetch:paypal-consumer
//
// Saves PayPal's public consumer help and policy pages (fees, buyer protection, disputes,
// refunds, account limits, security) into docs/knowledge/paypal/consumer/web/*.md for GLY's RAG.
//
// RUN THIS ON YOUR OWN COMPUTER. www.paypal.com shows a bot check to cloud servers, so it
// returns nothing useful from a hosted sandbox or CI. This script does not try to get past
// that check; it respects robots.txt and waits between requests.
//
// It starts from the pages in SEEDS, then follows links to help articles (/cshelp/article/)
// found on those pages, up to --max-pages. Pages that fail or come back too short are skipped.
// It also downloads PayPal's official Privacy Statement PDF from paypalobjects.com (that host
// does work from servers) and converts it with `pdftotext` (poppler-utils) if installed.
//
// Re-running replaces consumer/web/ only; consumer/*.md files you add by hand are kept.
// consumer/web/ is git-ignored: it is PayPal's copyrighted content, rebuilt by this script.
//
// Options:  --region=us (default)   --max-pages=N (default 80)   --delay-ms=N (default 1500)

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";

const args = new Map<string, string | undefined>(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k ?? "", v];
  }),
);
const REGION = (args.get("region") ?? "us").toLowerCase();
const MAX_PAGES = Number(args.get("max-pages") ?? 80);
const DELAY_MS = Number(args.get("delay-ms") ?? 1500);
const OUT = resolve("docs/knowledge/paypal/consumer/web");
const TODAY = new Date().toISOString().slice(0, 10);
const BASE = "https://www.paypal.com";
// A normal browser user agent: PayPal serves its help pages to browsers.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Consumer pages to start from. Edit freely; missing pages are skipped. */
const SEEDS = [
  `/${REGION}/legalhub/paypal/useragreement-full`, // fees, buyer protection, disputes, limitations, refunds
  `/${REGION}/legalhub/paypal/acceptableuse-full`,
  `/${REGION}/digital-wallet/paypal-consumer-fees`,
  `/${REGION}/webapps/mpp/paypal-fees`,
  `/${REGION}/security/buyer-protection`,
  `/${REGION}/webapps/mpp/paypal-safety-and-security`,
  `/${REGION}/security/learn-about-fake-messages`,
  `/${REGION}/cshelp/personal`,
  `/${REGION}/cshelp/topic/disputes-and-limitations-help`,
  `/${REGION}/cshelp/topic/payments-and-transfers`,
  `/${REGION}/cshelp/topic/my-account`,
  `/${REGION}/cshelp/topic/login-and-security`,
  `/${REGION}/cshelp/topic/my-wallet`,
];

function topicFor(text: string): string {
  const t = text.toLowerCase();
  if (/dispute|claim|chargeback|resolution/.test(t)) return "disputes";
  if (/purchase protection|buyer protection/.test(t)) return "buyer_protection";
  if (/seller protection/.test(t)) return "seller_protection";
  if (/refund/.test(t)) return "refunds";
  if (/\bfee|fees|currency conversion|exchange rate/.test(t)) return "fees";
  if (/limitation|limited|verify|verification|identity|confirm your/.test(t)) return "kyc";
  if (/password|login|log in|security|scam|phishing|fake/.test(t)) return "account";
  if (/send money|pay |payment|transfer|wallet|card|bank/.test(t)) return "payments";
  return "other";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "index";

async function robotsDisallow(): Promise<string[]> {
  const res = await fetch(`${BASE}/robots.txt`, { headers: { "user-agent": UA } }).catch(() => null);
  if (!res?.ok) return [];
  const rules: string[] = [];
  let applies = false;
  for (const line of (await res.text()).split(/\r?\n/)) {
    const [k, ...v] = line.split(":");
    const key = k?.trim().toLowerCase();
    const val = v.join(":").trim();
    if (key === "user-agent") applies = val === "*";
    else if (applies && key === "disallow" && val) rules.push(val);
  }
  return rules;
}

const allowed = (path: string, rules: string[]) =>
  !rules.some((r) => new RegExp("^" + r.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")).test(path));

function makeTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
  td.use(tables);
  td.remove(["script", "style", "noscript", "svg", "button", "form", "nav", "aside", "footer", "header", "iframe"] as any);
  td.addRule("plainLinks", { filter: "a", replacement: (content) => content });
  td.addRule("noImages", { filter: "img", replacement: () => "" });
  return td;
}

const CHROME = [
  /^#{0,6}\s*.*\bcookies?\b.*$/i,
  /^(skip to (main )?content|log in|sign up|back to top|print|download pdf)$/i,
  /^was this (article|page) helpful\??.*$/i,
  /^(yes|no)$/i,
  /^>>\s*view all legal agreements$/i,
];

function toMarkdown(html: string, td: TurndownService): { title: string; md: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "PayPal Help")
    .replace(/\s*[|-]\s*PayPal.*$/i, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .trim();
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf("</main>");
  const body = start >= 0 && end > start ? html.slice(start, end + 7) : html.replace(/^[\s\S]*?<body[^>]*>/i, "");
  const md = td
    .turndown(body)
    .split("\n")
    .filter((l) => !CHROME.some((re) => re.test(l.trim())))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, md };
}

/** Official PDFs PayPal hosts on paypalobjects.com, which (unlike www.paypal.com) serves servers too. */
const PDFS = [
  {
    url: "https://www.paypalobjects.com/marketing/ua/pdf/US/en/privacy-full.pdf",
    name: "privacy-statement-us",
    title: "PayPal Privacy Statement (US)",
    region: "US",
    topic: "account",
    // Section headings in the PDF, turned into Markdown headings so chunks keep their context.
    headings: [
      "Overview", "Non-Account Holders", "Categories of Personal Information We Collect", "How is Personal Information used?",
      "Do We Disclose Personal Information, and why?", "How long does PayPal store your Personal Information?",
      "How Do We Use Cookies and Tracking Technologies?", "Your Data Protection Rights",
      "How Do We Protect Your Personal Information?", "Can Children Use Our Services?", "Definitions",
    ],
  },
];

async function fetchPdfs(): Promise<number> {
  let saved = 0;
  for (const pdf of PDFS) {
    const res = await fetch(pdf.url, { headers: { "user-agent": UA } }).catch(() => null);
    if (!res?.ok) { console.warn(`  skip ${pdf.url}: HTTP ${res?.status ?? "network error"}`); continue; }
    const dir = await mkdtemp(join(tmpdir(), "paypal-pdf-"));
    const file = join(dir, "doc.pdf");
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    let text: string;
    try {
      text = execFileSync("pdftotext", [file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    } catch {
      console.warn(`  skip ${pdf.name}: needs \`pdftotext\` (brew install poppler / apt install poppler-utils)`);
      await rm(dir, { recursive: true, force: true });
      continue;
    }
    await rm(dir, { recursive: true, force: true });
    // Drop the table of contents (everything before the second "Overview") and page furniture.
    const starts = [...text.matchAll(/^Overview\s*$/gm)].map((m) => m.index!);
    const body = (starts.length > 1 ? text.slice(starts[1]) : text)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => !/^(>> View all legal agreements|Download PDF)$|^\d+\/\d+\/\d+, \d+:\d+|^https?:\/\/|^\d+ of \d+$|^Page \d+/.test(l))
      .map((l) => (pdf.headings.includes(l) ? `\n## ${l}\n` : l))
      .join("\n")
      .replace(/(?<![\n.:;!?])\n(?=[a-z(])/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const doc =
      `---\nsource: ${pdf.url}\ntitle: "${pdf.title}"\naudience: consumer\nregion: ${pdf.region}\ntopic: ${pdf.topic}\ndocDate: ${TODAY}\n---\n\n` +
      `# ${pdf.title}\n\nOfficial PayPal document, converted from the PDF PayPal publishes.\n\n${body}\n`;
    await writeFile(join(OUT, `${pdf.name}.md`), doc);
    console.log(`  pdf     ${pdf.name}  (${Math.round(doc.length / 1024)} KB)`);
    saved++;
  }
  return saved;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const f of await readdir(OUT)) if (f.endsWith(".md")) await rm(join(OUT, f));

  const pdfs = await fetchPdfs();

  const rules = await robotsDisallow();
  const td = makeTurndown();
  const queue = SEEDS.map((p) => BASE + p);
  const seen = new Set<string>(queue.map((u) => new URL(u).pathname));
  const written = new Set<string>();
  let fetched = 0;
  let botChecked = 0;

  while (queue.length && fetched < MAX_PAGES) {
    const url = queue.shift()!;
    const path = new URL(url).pathname;
    if (!allowed(path, rules)) { console.log(`  robots  skip ${path}`); continue; }
    await sleep(DELAY_MS);
    fetched++;
    const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" }, redirect: "follow" }).catch(() => null);
    const html = res ? await res.text().catch(() => "") : "";
    if (/please enable js and disable any ad blocker|captcha-delivery|geo\.ddc\.paypal\.com/i.test(html)) {
      botChecked++;
      console.warn(`  skip ${path}: PayPal showed a bot check (run this on your own computer, not a server)`);
      continue;
    }
    if (!res?.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) {
      console.warn(`  skip ${path}: HTTP ${res?.status ?? "network error"}`);
      continue;
    }

    // Follow links to help articles found on this page.
    for (const m of html.matchAll(/href="((?:https:\/\/www\.paypal\.com)?\/[a-z]{2}\/cshelp\/article\/[^"#?]+)"/gi)) {
      const next = new URL(m[1]!, BASE);
      if (!seen.has(next.pathname)) { seen.add(next.pathname); queue.push(next.href); }
    }

    const { title, md } = toMarkdown(html, td);
    if (md.length < 400) { console.log(`  thin    skip ${path} (${md.length} chars)`); continue; }
    const finalPath = new URL(res.url || url).pathname;
    const name = slug(finalPath.replace(/^\/[a-z]{2}\//, ""));
    if (written.has(name)) continue;
    written.add(name);

    const doc =
      `---\nsource: ${BASE}${finalPath}\ntitle: "${title.replace(/"/g, "'")}"\naudience: consumer\n` +
      `region: ${REGION.toUpperCase()}\ntopic: ${topicFor(title + " " + md.slice(0, 2000))}\ndocDate: ${TODAY}\n---\n\n` +
      `# ${title}\n\n${md}\n`;
    await writeFile(join(OUT, `${name}.md`), doc);
    console.log(`  page    ${finalPath}  (${Math.round(doc.length / 1024)} KB)`);
  }

  console.log(`\nSaved ${written.size} help pages and ${pdfs} PDF documents to ${OUT}.`);
  if (botChecked && !written.size) {
    console.log("PayPal blocked every request with a bot check. Run this from your own computer's normal internet connection.");
  } else {
    console.log("Next: restart the server (it embeds new pages at start-up), then commit docs/knowledge/paypal/consumer/web/.");
  }
}

await main();

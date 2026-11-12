// Enforces the GLY boundary contract: allowed dependencies only.

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { it } from "node:test";

const GLY = resolve(import.meta.dirname, "..");

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && e.name !== "tests") out.push(...(await sourceFiles(p)));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const ALLOWED_LOCAL = /^(\.\.\/)+(calls|shared\/(llm|db\/vector|tasks|logging|types))\//;
const ALLOWED_PACKAGES = new Set(["zod", "ws"]);
const FORBIDDEN = /playwright|puppeteer|paypal|braintree|stripe|\/ARB\/|\/PULSE\//i;

it("GLY imports only its own files, allowed shared modules and calls/", async () => {
  const problems: string[] = [];
  for (const file of await sourceFiles(GLY)) {
    const src = await readFile(file, "utf8");
    for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      const spec = m[1]!;
      const where = relative(GLY, file);
      if (FORBIDDEN.test(spec)) problems.push(`${where}: forbidden import ${spec}`);
      else if (spec.startsWith("node:")) continue;
      else if (spec.startsWith(".")) {
        const target = relative(GLY, resolve(join(file, ".."), spec)).replace(/\\/g, "/");
        if (target.startsWith("..") && !ALLOWED_LOCAL.test(target.replace(/^(\.\.\/)+/, "../"))) problems.push(`${where}: ${spec} is outside GLY's allowed dependencies`);
      } else if (!ALLOWED_PACKAGES.has(spec)) problems.push(`${where}: package ${spec} is not on GLY's allowlist`);
    }
    if (/PAYPAL_(CLIENT_)?SECRET|PAYPAL_CLIENT_ID/.test(src)) problems.push(`${relative(GLY, file)}: references PayPal API credentials`);
  }
  assert.deepEqual(problems, []);
});

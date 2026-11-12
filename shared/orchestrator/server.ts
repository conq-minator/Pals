/**
 * PALS: the whole system in one process.   npm start
 *
 *   browser <-WebSocket-> GLY <-> Orchestrator <-calls/-> ARB, DEFENDER, PULSE <-> PayPal
 *
 * GLY is the only thing the user talks to. ARB, DEFENDER and PULSE register their actions with
 * the Central Calls System; the orchestrator is GLY's gateway to them.
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ArbService } from '../../ARB/index.js';
import { DefenderService } from '../../defender/index.js';
import { PulseService } from '../../PULSE/index.js';
import { PalsOrchestrator } from './index.js';

import { createLogger } from '../../GLY/shared/logging/index.ts';
import { InMemoryTaskBus } from '../../GLY/shared/tasks/index.ts';
import { GlyService } from '../../GLY/GLY/chat/handler.ts';
import { attachChatSocket } from '../../GLY/GLY/chat/socket.ts';
import { loadConfig } from '../../GLY/GLY/config.ts';
import { createLlm } from '../../GLY/GLY/llm.ts';
import { createRagDeps } from '../../GLY/GLY/rag/deps.ts';
import { ingestCorpus } from '../../GLY/GLY/rag/ingest/ingest.ts';

const glyRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../GLY');
const log = createLogger('PALS');
const config = loadConfig({ port: Number(process.env.PALS_API_PORT ?? process.env.GLY_PORT ?? 8787) });
const publicUrl = process.env.PALS_PUBLIC_URL ?? `http://localhost:${config.port}`;

// ---- The background PALs. Each registers its own actions with calls/. ----
new ArbService();
new DefenderService();

const paypalReady = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
if (paypalReady) {
  new PulseService({
    mode: (process.env.PAYPAL_MODE ?? 'sandbox') as 'sandbox' | 'live',
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    apiBaseUrl: process.env.PAYPAL_API_BASE_URL || undefined,
    returnUrl: `${publicUrl}/paypal/return`,
    cancelUrl: `${publicUrl}/paypal/cancel`
  });
} else {
  log.warn('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set: PULSE is offline. Research and offers work; payments will be refused.');
}

// ---- GLY, with the real gateway instead of FakeCalls. ----
const rag = await createRagDeps(log);
if (!process.env.DATABASE_URL) {
  await ingestCorpus({ dir: resolve(glyRoot, 'docs/knowledge/paypal'), ...rag, corpusVersion: 'boot', log });
}

const bus = new InMemoryTaskBus();
const orchestrator = new PalsOrchestrator({
  bus,
  defaultCurrency: process.env.PALS_DEFAULT_CURRENCY,
  settlementCurrency: process.env.PALS_SETTLEMENT_CURRENCY,
  approvalSecret: process.env.PALS_APPROVAL_SECRET
});
const gly = new GlyService({ config, llm: createLlm(config), rag, calls: orchestrator, bus, log });
gly.start();

// ---- HTTP: chat page, health, and the PayPal return/cancel landing pages. ----
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (title: string, body: string) =>
  `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>` +
  `<body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem">` +
  `<h2>${esc(title)}</h2><p>${esc(body)}</p><p>You can close this tab and go back to the chat.</p>`;

const demoPage = resolve(glyRoot, 'GLY/demo/index.html');
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', publicUrl);
  const html = (status: number, content: string) =>
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(content);

  try {
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({ ok: true, pals: { GLY: true, ARB: true, DEFENDER: true, PULSE: paypalReady } })
      );
      return;
    }
    if (url.pathname === '/') {
      const raw = await readFile(demoPage, 'utf8');
      html(200, raw
        .replace('<title>GLY demo chat</title>', '<title>PALS</title>')
        .replace(
          /<header>.*?<\/header>/s,
          `<header><b>PALS</b><span>GLY + ARB + DEFENDER + PULSE (${paypalReady ? `PayPal ${process.env.PAYPAL_MODE ?? 'sandbox'}` : 'PayPal not configured'})</span></header>`
        ));
      return;
    }
    if (url.pathname === '/paypal/return') {
      const orderId = url.searchParams.get('token');
      if (!orderId) return void html(400, page('Missing order', 'PayPal did not say which order this is.'));
      const done = await orchestrator.completePayment(orderId);
      if (done.ok) {
        return void html(200, page('Payment complete', `${done.amount.currency} ${done.amount.value.toFixed(2)} paid. Receipt ${done.receiptId}.`));
      }
      return void html(done.retryable ? 409 : 400, page('Payment not completed', done.reason));
    }
    if (url.pathname === '/paypal/cancel') {
      const orderId = url.searchParams.get('token');
      if (orderId) orchestrator.cancelPayment(orderId);
      return void html(200, page('Payment cancelled', 'Nothing was charged.'));
    }
    res.writeHead(404).end();
  } catch (err) {
    log.error('http handler failed', { error: String(err) });
    html(500, page('Something went wrong', 'Please go back to the chat and try again.'));
  }
});
attachChatSocket(server, gly, log);

server.listen(config.port, () => {
  log.info('PALS listening', { url: publicUrl, llm: config.llmProvider, paypal: paypalReady ? process.env.PAYPAL_MODE ?? 'sandbox' : 'offline' });
});

const shutdown = async () => {
  gly.stop();
  server.close();
  await rag.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

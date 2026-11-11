import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArbService, ARBQueryExtractor, ARBProgressEmitter } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3333;
const arb = new ArbService();

const server = http.createServer(async (req: any, res: any) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // 1. Static HTML UI
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const candidates = [
      path.join(__dirname, 'index.html'),
      path.resolve(process.cwd(), 'ARB/ui/index.html')
    ];
    for (const htmlPath of candidates) {
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(htmlPath).pipe(res);
        return;
      }
    }
  }

  // 2. Server-Sent Events (SSE): Real-time progress updates per task
  const progressMatch = url.pathname.match(/^\/api\/progress\/([^/]+)$/);
  if (req.method === 'GET' && progressMatch) {
    const targetTaskId = progressMatch[1];
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const listener = (payload: any) => {
      if (payload.taskId === targetTaskId) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const emitter = ARBProgressEmitter.getInstance();
    emitter.addListener(listener);

    req.on('close', () => {
      emitter.removeListener(listener);
    });
    return;
  }

  function parseJson(bodyStr: string, resObj: any): any | null {
    try {
      return JSON.parse(bodyStr || '{}');
    } catch {
      resObj.writeHead(400, { 'Content-Type': 'application/json' });
      resObj.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      return null;
    }
  }

  // 3. API: Search & Arbitrate
  if (req.method === 'POST' && url.pathname === '/api/search') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      const parsed = parseJson(body, res);
      if (!parsed) return;
      try {
        const prompt = parsed.prompt || parsed.query || '';
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Prompt is required' }));
          return;
        }

        const extracted = ARBQueryExtractor.extractFromText(prompt);
        const payload = ARBQueryExtractor.toPayload(extracted);
        const correlationId = `ui_${Date.now().toString(36)}`;
        const result = await arb.conductResearch(payload, correlationId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          taskId: correlationId,
          extracted,
          result
        }));
      } catch (err: unknown) {
        console.error('[ARB Server Error /api/search]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  // 4. API: Refine Existing Task
  if (req.method === 'POST' && url.pathname === '/api/refine') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      const parsed = parseJson(body, res);
      if (!parsed) return;
      try {
        const { taskId, prompt, refinementPrompt } = parsed;
        const text = prompt || refinementPrompt;
        if (!taskId || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'taskId and prompt are required for refinement' }));
          return;
        }

        const result = await arb.refineResearch(taskId, text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          taskId,
          result
        }));
      } catch (err: unknown) {
        console.error('[ARB Server Error /api/refine]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  // 4b. API: Answer Ambiguity Clarification
  if (req.method === 'POST' && url.pathname === '/api/answer') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      const parsed = parseJson(body, res);
      if (!parsed) return;
      try {
        const { taskId, answer, selectedOption } = parsed;
        const option = answer || selectedOption;
        if (!taskId || !option) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'taskId and answer are required' }));
          return;
        }

        const result = await arb.answerResearch(taskId, option);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          taskId,
          result
        }));
      } catch (err: unknown) {
        console.error('[ARB Server Error /api/answer]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  // 5. API: Prepare Purchase Proposal
  if (req.method === 'POST' && url.pathname === '/api/propose') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      const parsed = parseJson(body, res);
      if (!parsed) return;
      try {
        const { listing, taskId, options } = parsed;
        if (!listing) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Listing is required' }));
          return;
        }

        const proposal = arb.preparePurchase(listing, taskId || `task_${Date.now().toString(36)}`, options);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(proposal));
      } catch (err: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================================`);
  console.log(`   PALS ARB (ArbitrationPal) Demo Studio is Live!              `);
  console.log(`   Local URL:   http://localhost:${PORT}                       `);
  console.log(`   Network URL: http://0.0.0.0:${PORT}                         `);
  console.log(`================================================================\n`);
});

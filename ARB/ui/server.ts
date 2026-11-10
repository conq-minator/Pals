import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArbService, ARBQueryExtractor } from '../index.js';

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

  // 2. API: Search & Arbitrate
  if (req.method === 'POST' && url.pathname === '/api/search') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
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

  // 3. API: Prepare Purchase Proposal
  if (req.method === 'POST' && url.pathname === '/api/propose') {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { listing, taskId, options } = JSON.parse(body || '{}');
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

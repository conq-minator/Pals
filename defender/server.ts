import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import { DefenderService } from './index.js';
import { DefenderAssessmentRequestSchema } from '../shared/types/index.js';

const app = express();
const port = process.env.DEFENDER_PORT || 8100;

// Create a single DefenderService instance
const defenderService = new DefenderService();

// --- CORS middleware (simple permissive config for development) ---
const allowedOrigins = new Set(
  ['http://localhost:3333', 'http://localhost:8000', process.env.ARB_UI_URL, process.env.PULSE_PUBLIC_URL].filter(Boolean)
);
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Parse JSON body
app.use(express.json());

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- POST /defender/assess ---
app.post('/defender/assess', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Schema validation
    const validation = DefenderAssessmentRequestSchema.safeParse(body);
    if (!validation.success) {
      res.status(400).json({
        decision: 'REJECTED',
        riskScore: 1.0,
        flaggedThreats: [
          {
            type: 'PRICE_TAMPERING',
            severity: 'CRITICAL',
            details: 'Payload format failed schema validation',
          }
        ],
        evaluatedAt: new Date().toISOString(),
      });
      return;
    }

    const response = await defenderService.assessTransaction(validation.data);
    res.json(response);
  } catch (err) {
    console.error('DEFENDER assess error:', err);
    res.status(500).json({
      decision: 'REJECTED',
      riskScore: 1.0,
      flaggedThreats: [
        {
          type: 'PRICE_TAMPERING',
          severity: 'CRITICAL',
          details: 'Internal defender error',
        }
      ],
      evaluatedAt: new Date().toISOString(),
    });
  }
});

// --- GET /defender/audit ---
app.get('/defender/audit', (_req: Request, res: Response) => {
  res.json(DefenderService.getAuditLog());
});

// --- Error handling ---
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('DEFENDER error handler:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

app.listen(port, () => {
  console.log(`DEFENDER server listening on port ${port}`);
});
import 'dotenv/config';
import express from 'express';
import { PulseService, PulseConfig } from './index.js';
import { PulsePaymentRequest } from '../shared/types/index.js';

const PORT = process.env.PALS_API_PORT ?? 8000;
const base = process.env.PULSE_PUBLIC_URL ?? `http://localhost:${PORT}`;

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env');
  process.exit(1);
}

const config: PulseConfig = {
  mode: (process.env.PAYPAL_MODE ?? 'sandbox') as 'sandbox' | 'live',
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  apiBaseUrl: process.env.PAYPAL_API_BASE_URL,
  returnUrl: `${base}/paypal/return`,
  cancelUrl: `${base}/paypal/cancel`,
};

const service = new PulseService(config);

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: config.mode });
});

// Create order
app.post('/pulse/orders', async (req, res) => {
  try {
    const result = await service.createOrder(req.body as PulsePaymentRequest);
    if (result.status === 'CREATED') {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PayPal return
app.get('/paypal/return', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).send('<html><body>Missing token parameter</body></html>');
    }
    const result = await service.captureOrder(token);
    if (result.status === 'COMPLETED') {
      const fee = result.paypalFee ?? 0;
      const html = `<html><body>
        <h2>Payment Successful!</h2>
        <p>Order ID: ${result.paypalOrderId}</p>
        <p>Capture ID: ${result.paypalCaptureId}</p>
        <p>Amount: ${result.finalAmountCaptured} ${result.currency}</p>
        <p>PayPal Fee: $${fee.toFixed(2)}</p>
        <p>Status: ${result.status}</p>
      </body></html>`;
      res.send(html);
    } else {
      const html = `<html><body>
        <h2>Payment Failed</h2>
        <p>Reason: ${result.errorMessage}</p>
        <p>Order ID: ${result.paypalOrderId}</p>
        <p>Status: ${result.status}</p>
      </body></html>`;
      res.status(400).send(html);
    }
  } catch (err) {
    res.status(500).send(`<html><body>Error: ${(err as Error).message}</body></html>`);
  }
});

// PayPal cancel
app.get('/paypal/cancel', (_req, res) => {
  res.send('<html><body><h2>Payment cancelled</h2></body></html>');
});

// Refund
app.post('/pulse/refund', async (req, res) => {
  try {
    const { paypalOrderId, reason } = req.body;
    const result = await service.refundOrder(paypalOrderId, reason ?? undefined);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List transactions
app.get('/pulse/transactions', (_req, res) => {
  res.json(service.listTransactions());
});

app.listen(PORT, () => {
  console.log(`PULSE API listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
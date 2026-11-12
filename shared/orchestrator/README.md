# Orchestrator

Connects GLY to the real ARB, DEFENDER and PULSE. Before this, GLY ran against `FakeCalls`
(made-up products and receipts) and the other three PALs had no caller.

```
browser <-WebSocket-> GLY --send()--> PalsOrchestrator --calls/--> ARB
                       ^                    |            --calls/--> DEFENDER
                       +---- task bus ------+            --calls/--> PULSE --> PayPal
```

- `index.ts`: `PalsOrchestrator`. Implements GLY's `CallsGateway`, so GLY needs no changes to
  switch from fake to real. Every hop to another PAL is a `CentralCallsSystem.dispatch`.
- `server.ts`: starts all four PALs in one process and serves the chat page. `npm start`.

## What happens to each GLY action

| GLY sends | Orchestrator does | GLY gets back |
|---|---|---|
| `research.start` | `ARB:extract.requirements`, then `ARB:research.start` | `task.completed` with ARB's listings (price = landed cost) |
| `purchase_prep.start` | picks the listing the user meant, `ARB:purchase_prep.start` | `proposal.ready` (approval card) |
| `payment.execute` | checks amount against the offer, signs an approval token, `DEFENDER:security.assess_transaction`, then `PULSE:payment.create_order` | `task.progress` with the PayPal link, then `task.completed` (receipt) after `/paypal/return` triggers `PULSE:payment.capture` |
| `transaction.query` | `PULSE:transaction.list` for that user | `task.completed` with rows |

## Rules it enforces in code

- Payment only starts from an approved offer whose user, amount and currency match ARB's proposal to the cent.
- Anything but `APPROVED` from DEFENDER stops the payment. If DEFENDER or PULSE cannot be reached, the payment stops.
- One PayPal order per approval and one capture per order, even on double taps or a repeated return.
- PayPal cannot charge INR. An offer researched in a currency PayPal does not support is re-quoted
  by ARB in `PALS_SETTLEMENT_CURRENCY` for the same SKU and merchant, and the user is told.

## Run

```bash
npm run setup          # installs root and GLY dependencies
cp .env.example .env   # set GEMINI_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PALS_PUBLIC_URL
npm start              # http://localhost:8000
npm run test:system    # end-to-end tests, no keys or internet needed
```

Without PayPal keys the server still starts: research and offers work, payments are refused.

## Not done yet

- State (research, offers, payments in flight) is in memory. A restart between "Approve" and the PayPal return loses the payment task.
- ARB's follow-up questions (`research.needs_input`) have no screen in GLY, so ARB is asked to take its best guess.
- Refunds are not reachable from chat (GLY refuses them by design); `PULSE:payment.refund` exists.
- `transaction.query` shows payments made through PALS in this process, not the user's PayPal history or balance.
- The approval token is HMAC-signed here, but PULSE and DEFENDER do not verify the signature yet.

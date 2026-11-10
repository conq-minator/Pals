# PULSE Technical Context & Operating Architecture

> **Module:** PULSE (PaymentPal)  
> **Lifecycle Phase:** Phase 0 (Specification Baseline)  
> **Target Audience:** AI Coding Agents assigned to PULSE

---

## 1. Internal Architecture

```mermaid
flowchart TD
    ReqIn[Inbound Call from calls/: payment.execute] --> TokenValidator[Approval Token & Invariant Validator]
    
    TokenValidator -- Invalid / Amount Mismatch --> Reject[Abort & Throw PolicyException]
    TokenValidator -- Valid --> OrderLifecycle[Order Lifecycle Manager]
    
    subgraph PayPal Integration Subsystem
        OrderLifecycle --> OAuthManager[PayPal OAuth2 Credential Manager]
        OAuthManager --> OrdersAPI[PayPal Orders v2 API]
        OAuthManager --> CapturesAPI[PayPal Payments & Captures API]
        OAuthManager --> RefundsAPI[PayPal Disputes & Refunds API]
    end
    
    WebhookReceiver[PayPal Webhook Endpoint] --> SigVerifier[Webhook Signature Verifier]
    SigVerifier --> IdempotencyGuard[Idempotency & Replay Guard]
    IdempotencyGuard --> LedgerWriter[Immutable Audit Ledger & Receipt Generator]
    
    CapturesAPI --> LedgerWriter
    LedgerWriter --> RespOut[Return PalCallResponse to calls/ -> GLY]
```

---

## 2. Order Lifecycle State Machine

PULSE strictly isolates the distinct stages of payment processing:

1. **Stage 1: ORDER_CREATED**
   - PULSE calls PayPal `POST /v2/checkout/orders` with `intent: "CAPTURE"`.
   - Returns a `paypalOrderId` and checkout approval redirect URL.
2. **Stage 2: BUYER_APPROVED**
   - The buyer authenticates with PayPal and approves the transaction.
   - PayPal emits an approval return webhook / callback.
3. **Stage 3: AMOUNT_VERIFIED (Deterministic Gate)**
   - Prior to capture, PULSE fetches order details from PayPal:
     $$\text{capturedAmount} \le \text{token.authorizedMaxAmount}$$
   - If `capturedAmount > token.authorizedMaxAmount`, capture is **aborted**.
4. **Stage 4: PAYMENT_CAPTURED**
   - PULSE executes `POST /v2/checkout/orders/{id}/capture`.
   - On `201 Created` with status `COMPLETED`, the transaction is settled.
5. **Stage 5: LEDGER_WRITTEN**
   - Transaction ID, capture ID, timestamps, fees, and currency are committed to the immutable database ledger.
   - Digital receipt payload returned to Orchestrator.

---

## 3. Webhook Handling & Idempotency Rules

- **Signature Verification:** Every webhook must be validated against PayPal's public keys via PayPal's `/v1/notifications/verify-webhook-signature` endpoint. Unsigned or invalid webhooks are rejected with `400 Bad Request`.
- **Idempotency Keys:** Every payment capture request generates a unique idempotency key:
  $$\text{PayPal-Request-Id} = \text{SHA256}(\text{approvalToken} + \text{proposalId})$$
  This guarantees that duplicate network retries can never double-charge a user.

---

## 4. Integration with PayPal Agent Toolkit & MCP

In Phase 1+, PULSE wraps official PayPal integration tools:
- Standard REST API v2 SDK.
- PayPal Agent Toolkit / Model Context Protocol (MCP) server endpoints for automated transaction status lookups, invoice management, and dispute checking.
- Sandboxed credentials configured strictly via `.env` (`PAYPAL_MODE=sandbox`).


# DEFENDER Boundary & Responsibility Contract

> **Module:** DEFENDER (Provisional Name)  
> **Rule:** Every developer and AI agent working in `defender/` must strictly observe these boundaries.

---

## 1. What DEFENDER WILL DO (Phase 4)

1. **Pre-Payment Security Audit:** Evaluates purchase proposals and merchant destinations before payments are sent to PULSE.
2. **Merchant Credibility Analysis:** Validates merchant SSL, domain age, whois, and reputation against threat lists.
3. **Prompt Injection Mitigation:** Inspects raw DOM strings and merchant reviews for prompt hijacking attempts.
4. **Price Tampering Detection:** Confirms that checkout redirection does not mutate approved prices or SKUs.
5. **Multi-Action Clearance:** Emits `APPROVED`, `REJECTED`, `VERIFICATION_REQUIRED`, or `HUMAN_ESCALATION`.

---

## 2. What DEFENDER DOES NOT DO

1. **DO NOT Run in Phase 1:** No active scanning, model training, or blocking logic may execute during Phase 1.
2. **DO NOT Execute Payments:** DEFENDER never contacts PayPal or charges bank cards; payment execution belongs exclusively to **PULSE**.
3. **DO NOT Mutate Orders:** DEFENDER cannot modify prices, change quantities, or alter shipping destinations; it can only approve, reject, or escalate.
4. **DO NOT Replace Deterministic Policies:** Deterministic budget checks in `shared/policy/` take precedence and execute before DEFENDER.

---

## 3. Allowed Dependencies & Tools (Phase 4)

- `calls/` (Single Central Communication Gateway for all inter-PAL calls)
- `shared/types/` (Typed interface definitions from [API_CONTRACTS.md](../API_CONTRACTS.md))
- `shared/logging/` (Security event audit logging)
- External Threat Feeds (Google Safe Browsing API, VirusTotal, PhishTank)

---

## 4. Cross-Module Delegation Triggers (via `calls/`)

All security assessments and escalation alerts must pass through `calls/`.

| Trigger Event | Target via `calls/` | Envelope & Action |
| :--- | :--- | :--- |
| Pre-payment assessment requested | Inbound via `calls/` | `PalCallEnvelope(action='security.assess_transaction', payload=...)` |
| Security check approved | **PULSE** via `calls/` | `PalCallResponse(status='SUCCESS', data={decision: 'APPROVED'})` |
| Security threat flagged | **GLY** via `calls/` | `PalCallResponse(status='ERROR', error={code: 'SECURITY_VIOLATION'})` |


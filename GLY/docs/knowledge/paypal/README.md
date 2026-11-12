# PayPal knowledge corpus (P3 input)

GLY answers PayPal questions **only** from the files in this folder. Anything wrong or
unofficial here becomes a wrong answer, so keep it to official PayPal sources.

## What's here

| Folder | Built by | Contents |
|---|---|---|
| `api-reference/` | `npm run fetch:paypal` | 13 PayPal REST APIs, converted from the official OpenAPI specs (Apache-2.0) |
| `developer-guides/` | `npm run fetch:paypal` | 69 developer.paypal.com pages: REST basics, auth, idempotency, errors, webhooks, sandbox testing, disputes, Orders API |
| `sources.json` | `npm run fetch:paypal` | Where everything came from and when |

`npm run fetch:paypal` **replaces** `api-reference/` and `developer-guides/` each time it runs.
Put pages you add by hand in a separate subfolder (for example `consumer/`) so they're kept.

**Not covered yet:** consumer topics (personal fees, buyer protection, account limits). Those
are on paypal.com help pages, so add them by hand in `consumer/` if GLY needs to answer them.

## File format

Every `.md` file (except this README) must start with this header:

```markdown
---
source: https://www.paypal.com/us/legalhub/paypal/useragreement-full
title: PayPal User Agreement
audience: consumer
region: US
topic: disputes
docDate: 2026-10-01
---

# Page title

## Section
...
```

| Field | Allowed values |
|---|---|
| `audience` | `consumer`, `developer`, `merchant`, `all` |
| `region` | a country code such as `US`, or `global` |
| `topic` | `fees`, `disputes`, `buyer_protection`, `seller_protection`, `refunds`, `account`, `kyc`, `api`, `payments`, `other` |
| `docDate` | the date you saved the page, `YYYY-MM-DD` |

Don't put comments on the header lines: everything after the colon is read as the value.
Files with a missing or invalid header are reported, and when any file fails, nothing is pruned from the store.

## Loading it

```bash
npm run ingest
```

Without `DATABASE_URL`, embeddings are saved in `.cache/` and the server syncs this folder at
start-up, embedding only new or changed pages.

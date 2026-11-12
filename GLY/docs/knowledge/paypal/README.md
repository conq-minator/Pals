# PayPal knowledge corpus (P3 input)

GLY answers PayPal questions **only** from the files in this folder. Anything wrong or
unofficial here becomes a wrong answer, so keep it to official PayPal sources.

## What's here

| Folder | Built by | Contents |
|---|---|---|
| `api-reference/` | `npm run fetch:paypal` | 13 PayPal REST APIs, converted from the official OpenAPI specs (Apache-2.0) |
| `developer-guides/` | `npm run fetch:paypal` | 76 developer.paypal.com pages: REST basics, auth, errors, webhooks, sandbox, disputes and the Resolution Center, refunds, fraud protection, buyer errors, Venmo |
| `consumer/web/` | `npm run fetch:paypal-consumer` | PayPal's US Privacy Statement (official PDF), plus PayPal help and policy pages: User Agreement, fees, buyer protection, disputes, limitations, security. **Run it on your own computer**: www.paypal.com shows a bot check to cloud servers, so from a server you only get the PDF |
| `consumer/` | by hand | Anything else you add yourself; kept across fetches |
| `pals-app/` | by hand, committed | How the PALS app itself works: agents, deal ranking, trust score, offers and approval, DEFENDER, FAQ. Keep in sync with the code |
| `sources.json` | `npm run fetch:paypal` | Where the fetched pages came from and when |

`developer-guides/` and `consumer/web/` are PayPal's copyrighted pages, so they are git-ignored: every machine
builds them once with `npm run knowledge` (repo root), which runs both fetch scripts.

`npm run fetch:paypal` **replaces** `api-reference/` and `developer-guides/`; `npm run fetch:paypal-consumer`
replaces `consumer/web/`. Everything else is kept.

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
| `topic` | `fees`, `disputes`, `buyer_protection`, `seller_protection`, `refunds`, `account`, `kyc`, `api`, `payments`, `pals_app`, `other` |
| `docDate` | the date you saved the page, `YYYY-MM-DD` |

Don't put comments on the header lines: everything after the colon is read as the value.
Files with a missing or invalid header are reported, and when any file fails, nothing is pruned from the store.

## Loading it

```bash
npm run ingest
```

Without `DATABASE_URL`, embeddings are saved in `.cache/` and the server syncs this folder at
start-up, embedding only new or changed pages.

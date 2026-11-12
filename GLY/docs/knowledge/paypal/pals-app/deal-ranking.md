---
source: https://github.com/conq-minator/Pals/blob/main/ARB/ranking/multi_factor_ranker.ts
title: "PALS app guide: how PALS finds and ranks deals"
audience: all
region: global
topic: pals_app
docDate: 2026-11-12
---

# How PALS finds deals

When you ask for a product, PALS searches merchant listings, then opens each product page to confirm the real price, stock and seller where the page allows it. A price that only appears in a search snippet is marked as unverified. Prices quoted as monthly instalments (EMI, "per month") are never treated as the item price.

PALS always works with the **landed cost**: the total you would actually pay, including shipping, platform or packaging fees, taxes, and customs or currency conversion for cross-border items. Results over your budget are not shown as matches.

If you name a merchant ("from Best Buy") PALS only uses that merchant. If you exclude a brand or merchant ("not Samsung", "skip Walmart"), PALS removes it.

# How PALS picks the best deal (ranking)

PALS does not simply sort by cheapest. Every listing gets four scores from 0 to 100, and a weighted total decides the order.

| Score | What it measures |
|---|---|
| Price efficiency | How far under your budget the landed cost is. Cheaper relative to your budget scores higher. |
| Delivery speed | How soon it arrives. Delivery within 15 minutes scores 100, within 1 hour 90, same day about 80, next day about 70, 2 to 4 days 60 to 70, a standard 3 to 5 days 50. If you asked for a delivery time ("by tomorrow"), listings that meet it get a boost and ones that miss it lose points. |
| Spec fit | How well it matches what you asked for. It starts at 90, drops 15 for each requested spec the listing does not confirm, and rises for a brand you prefer or a soft preference it satisfies. |
| Trust | The merchant's trust score (see below). |

The weights depend on what you are buying:

- **Most products** (electronics, clothing, home): price 40%, trust 25%, spec fit 25%, delivery speed 10%.
- **Food and quick delivery**: delivery speed 40%, price 30%, trust 20%, spec fit 10%.

## Badges

- **Best Value**: the listing with the highest total score. This is PALS's top pick.
- **Cheapest Option** (or **Lowest Price** if the best value is also the cheapest): the lowest landed cost.
- **Fastest Delivery**: the quickest delivery, shown only when it is faster than standard delivery.

Each result also has a short reason, for example "Selected for lowest landed price, trusted merchant".

# The merchant trust score

Every merchant gets a trust score from 0 to 100. It starts at 50 and moves with these signals:

| Signal | Effect |
|---|---|
| Valid SSL certificate | +10; missing or invalid SSL is -40 |
| Authorized dealer or the brand's own store | +15 |
| Physical stores or service centres | +10 |
| Return window of 14 days or more | +10; 7 to 13 days +5; no return window -15 |
| Accepts buyer-protected payments such as PayPal | +10; none -20 |
| Rating of 4.5 or higher with more than 500 reviews | +10; rating below 3.5 is -15 |
| Domain 5 or more years old | +5; less than 1 year old is -20 |

Tiers: 90 and above is Exemplary, 80 to 89 Trusted, 60 to 79 Moderate, 40 to 59 Suspicious, below 40 Unacceptable. By default PALS only recommends merchants with a trust score of at least 80.

# Coupons and negotiation

PALS looks for public coupon codes and applies the best valid one. It tells you plainly which it was: a public coupon, a real negotiated discount, or no discount because the merchant has fixed pricing. It never labels a coupon as a negotiation.

# Currencies

Prices are converted with live exchange rates when the merchant's currency differs from yours. PayPal cannot charge some currencies, Indian rupees (INR) included. When an offer is in such a currency, PALS re-prices the same item from the same merchant in a currency PayPal supports (US dollars by default) and tells you why before you approve.

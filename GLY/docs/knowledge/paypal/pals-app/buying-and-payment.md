---
source: https://github.com/conq-minator/Pals/blob/main/shared/orchestrator/README.md
title: "PALS app guide: offers, approval and payment"
audience: all
region: global
topic: pals_app
docDate: 2026-11-12
---

# Offers

When you ask to get an item ready, PALS re-checks the price, stock and merchant against its research and builds an **offer**. The offer panel shows the item, the merchant, the list price, the final price you will pay, and any coupon applied.

An offer is valid for **15 minutes**. After that it expires and cannot be paid; ask PALS to get the item ready again for a fresh price.

If the final price is over the budget you gave, PALS tells you instead of making an offer.

# Approving a payment

Pressing **Approve** authorises exactly one thing: paying this merchant, in this currency, at most this amount, before the offer expires. If anything in the payment differs from what you approved, it is refused.

Only you can approve your own offers. Another user cannot pay with your offer.

# What happens after you approve

1. **PALS runs a security check first.** If it finds a serious problem it blocks the payment; if it finds a likely problem it holds the payment for manual review. Either way nothing is charged, and PALS tells you the reason.
2. **PALS creates the PayPal order** for the exact approved amount.
3. **You confirm on PayPal.** A Pay with PayPal button appears in the offer panel. It opens PayPal's own page, where you log in and choose how to pay. PALS never sees your PayPal password or card.
4. **PALS completes the payment** when PayPal sends you back, and shows the receipt with the amount and receipt number.

If you cancel on PayPal's page, nothing is charged.

# You can't be charged twice

Pressing Approve twice, or coming back from PayPal twice, still charges you only once. PayPal is charged exactly the approved amount, to the cent.

# When nothing is charged

- The offer expired before you approved it.
- The security check blocked the payment or held it for review.
- The security check or the payment service could not be reached. PALS stops the payment rather than skipping a check.
- You cancelled on PayPal's page, or never confirmed there.

# Your transactions

"Show my transactions" lists the payments you made through PALS, newest first. It does not show your full PayPal history or your PayPal balance; for those, use the PayPal app or paypal.com.

# Refunds and problems with an order

PALS cannot refund a payment. Contact the merchant first. If the item never arrived or is not as described, you can open a dispute in PayPal's Resolution Center, where PayPal's buyer protection rules apply.

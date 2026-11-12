---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/payments_payment_v2.json
title: "PayPal Payments API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Payments (version 2.12)

Call the Payments API to authorize payments, capture authorized payments, refund payments that have already been captured, and show payment information. Use the Payments API in conjunction with the Orders API. For more information, see the PayPal Checkout Overview.

## Servers

- Server for https scheme.: https://api-m.paypal.com

## Operations

### Show details for authorized payment

`GET /v2/payments/authorizations/{authorization_id}`

Shows details for an authorized payment, by ID.

Parameters:

- `authorization_id` (path, required): The ID of the authorized payment for which to show details.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows authorization details.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 500: Internal Server Error.
- default: Default response.

### Capture authorized payment

`POST /v2/payments/authorizations/{authorization_id}/capture`

Captures an authorized payment, by ID.

Parameters:

- `authorization_id` (path, required): The PayPal-generated ID for the authorized payment to capture.
- `PayPal-Request-Id` (header): A unique ID identifying the request header for idempotency purposes.
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: capture_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows captured payment details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows captured payment details.
- 400: The request failed because it is not well-formed or is syntactically incorrect or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 409: The server has detected a conflict while processing this request.
- 422: The request failed because it is semantically incorrect or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Reauthorize authorized payment

`POST /v2/payments/authorizations/{authorization_id}/reauthorize`

Reauthorizes an authorized PayPal account payment, by ID. To ensure that funds are still available, reauthorize a payment after its initial three-day honor period expires. Within the 29-day authorization period, you can issue multiple re-authorizations after the honor period expires.

If 30 days have transpired since the date of the original authorization, you must create an authorized payment instead of reauthorizing the original authorized payment.

A reauthorized payment itself has a new honor period of three days.

You can reauthorize an authorized payment from 4 to 29 days after the 3-day honor period. The allowed amount depends on context and geography, for example in US it is up to 115% of the original authorized amount, not to exceed an increase of $75 USD.

Supports only the `amount` request parameter.

Parameters:

- `authorization_id` (path, required): The PayPal-generated ID for the authorized payment to reauthorize.
- `PayPal-Request-Id` (header): A unique ID identifying the request header for idempotency purposes.
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: reauthorize_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows the reauthorized payment details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows the reauthorized payment details.
- 400: The request failed because it is not well-formed or is syntactically incorrect or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 422: The request failed because it either is semantically incorrect or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Void authorized payment

`POST /v2/payments/authorizations/{authorization_id}/void`

Voids, or cancels, an authorized payment, by ID. You cannot void an authorized payment that has been fully captured.

Parameters:

- `authorization_id` (path, required): The PayPal-generated ID for the authorized payment to void.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.
- `PayPal-Request-Id` (header): A unique ID identifying the request header for idempotency purposes.
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows authorization details. This response is returned when the Prefer header is set to return=representation.
- 204: No Content.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 409: The request failed because a previous call for the given resource is in progress.
- 422: The request failed because it either is semantically incorrect or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Show captured payment details

`GET /v2/payments/captures/{capture_id}`

Shows details for a captured payment, by ID.

Parameters:

- `capture_id` (path, required): The PayPal-generated ID for the captured payment for which to show details.
- `Authorization` (header): Holds authorization information for external API calls.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows captured payment details.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 500: Internal Server Error.
- default: Default response.

### Refund captured payment

`POST /v2/payments/captures/{capture_id}/refund`

Refunds a captured payment, by ID. For a full refund, include an empty payload in the JSON request body. For a partial refund, include an `amount` object in the JSON request body.

Parameters:

- `capture_id` (path, required): The PayPal-generated ID for the captured payment to refund.
- `PayPal-Request-Id` (header): A unique ID identifying the request header for idempotency purposes.
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: refund_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows refund details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows refund details.
- 400: The request failed because it is not well-formed or is syntactically incorrect or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 409: The request failed because a previous call for the given resource is in progress.
- 422: The request failed because it either is semantically incorrect or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Find a list of eligible payment methods.

`POST /v2/payments/find-eligible-methods`

Get a list of eligible payment methods based on the input parameters provided.

Parameters:

- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.
- `User-Agent` (header): A characteristic string that lets servers and network peers identify the application, operating system, vendor, and/or version of the requesting user agent. API calls made by PayPal SDKs SHOULD be identified using this request header.
- `PayPal-Client-Metadata-Id` (header): A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..

Request body: find_eligible_methods_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that provides list of eligibile payments.
- 400: The request failed because it is not well-formed or is syntactically incorrect or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 422: The request failed because it either is semantically incorrect or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Show refund details

`GET /v2/payments/refunds/{refund_id}`

Shows details for a refund, by ID.

Parameters:

- `refund_id` (path, required): The PayPal-generated ID for the refund for which to show details.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows refund details.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 500: Internal Server Error.
- default: Default response.

## Schemas

### standard_header_schema

Standard headers are generally less restrictive in structure due to historical precedent across browsers, etc. This is a common schema for use in defining most standard headers.

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### card_brand

The card network or brand. Applies to credit, debit, gift, and payment cards.

Allowed values: `VISA`, `MASTERCARD`, `DISCOVER`, `AMEX`, `SOLO`, `JCB`, `STAR`, `DELTA`, `SWITCH`, `MAESTRO`, `CB_NATIONALE`, `CONFIGOGA`, `CONFIDIS`, `ELECTRON`, `CETELEM`, `CHINA_UNION_PAY`, `DINERS`, `ELO`, `HIPER`, `HIPERCARD`, `RUPAY`, `GE`, `SYNCHRONY`, `EFTPOS`, `CARTE_BANCAIRE`, `STAR_ACCESS`, `PULSE`, `NYCE`, `ACCEL`, `UNKNOWN`

### email

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### network_transaction

Reference values used by the card network to identify a transaction.

- `id` (string): Transaction reference id returned by the scheme. For Visa and Amex, this is the "Tran id" field in response. For MasterCard, this is the "BankNet reference id" field in response. For Discover, this is the "NRID" field in response. The pattern we expect for this field from Visa/Amex/CB/Discover is numeric, Mastercard/BNPP is alphanumeric and Paysecure is alphanumeric with special character -.
- `date` (string): The date that the transaction was authorized by the scheme. This field may not be returned for all networks. MasterCard refers to this field as "BankNet reference date". For some specific networks, such as MasterCard and Discover, this date field is mandatory when the `previous_network_transaction_reference_id` is passed.
- `network` (card_brand + object): 
- `acquirer_reference_number` (string): Reference ID issued for the card transaction. This ID can be used to track the transaction across processors, card brands and issuing banks.

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### country_code-2

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### phone-2

The phone number in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### discount_with_breakdown

The discount amount and currency code. For list of supported currencies and decimal precision, see the PayPal REST APIs Currency Codes.

### amount_breakdown

The breakdown of the amount. Breakdown provides details such as total item amount, total tax amount, shipping, handling, insurance, and discounts, if any.

- `item_total` (money + object): 
- `shipping` (money + object): 
- `handling` (money + object): 
- `tax_total` (money + object): 
- `insurance` (money + object): 
- `shipping_discount` (money + object): 
- `discount` (discount_with_breakdown + object): 

### amount_with_breakdown

The total order amount with an optional breakdown that provides details, such as the total item amount, total tax amount, shipping, handling, insurance, and discounts, if any.
If you specify `amount.breakdown`, the amount equals `item_total` plus `tax_total` plus `shipping` plus `handling` plus `insurance` minus `shipping_discount` minus discount.
The amount must be a positive number. For listed of supported currencies and decimal precision, see the PayPal REST APIs Currency Codes.

### account_id-2

The account identifier for a PayPal account.

### payee_base

The details for the merchant who receives the funds and fulfills the order. The merchant is also known as the payee.

- `email_address` (email + object): 
- `merchant_id` (account_id-2 + object): 

### payee

The merchant who receives the funds and fulfills the order. The merchant is also known as the payee.

### link_schema

The request data or link target.

- `additionalItems` (object): Any additional items.
- `dependencies` (object): The dependencies.
- `items` (object): An item.
- `definitions` (object): Definitions.
- `patternProperties` (object): The pattern properties.
- `properties` (object): The properties.
- `allOf` (array of object): An array of sub-schemas. The data must validate against all sub-schemas.
- `anyOf` (array of object): An array of sub-schemas. The data must validate against one or more sub-schemas.
- `oneOf` (array of object): An array of sub-schemas. The data must validate against one sub-schema.
- `not` (object): Not.
- `links` (array of object): An array of links.
- `fragmentResolution` (string): The fragment resolution.
- `media` (object): The media type and context-encoding scheme.
- `pathStart` (string): To apply this schema to the instances' URIs, start the URIs with this value.

### link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.
- `title` (string): The link title.
- `mediaType` (string): The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.
- `encType` (string): The media type in which to submit the request data.
- `schema` (link_schema + object): 
- `targetSchema` (link_schema + object): 

### error_details

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `location` (string): The location of the field that caused the error. Value is `body`, `path`, or `query`.
- `issue` (string, required): The unique, fine-grained application-level error code.
- `links` (array of link_description + object): An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links) that are either relevant to the issue by providing additional information or offering potential resolutions.
- `description` (string): The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.

### error

The error details.

- `name` (string, required): The human-readable, unique name of the error.
- `message` (string, required): The message that describes the error.
- `debug_id` (string, required): The PayPal internal ID. Used for correlation purposes.
- `details` (array of error_details + object): An array of additional details about the error.
- `links` (array of link_description + object): An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### authorization_status_details

The details of the authorized payment status.

- `reason` (string): The reason why the authorized status is `PENDING`. Values: PENDING_REVIEW, DECLINED_BY_RISK_FRAUD_FILTERS.

### authorization_status

The status fields and status details for an authorized payment.

- `status` (string): The status for the authorized payment. Values: CREATED, CAPTURED, DENIED, PARTIALLY_CAPTURED, VOIDED, PENDING.
- `status_details` (authorization_status_details + object): 

### seller_protection

The level of protection offered as defined by [PayPal Seller Protection for Merchants](https://www.paypal.com/us/webapps/mpp/security/seller-protection).

- `status` (string): Indicates whether the transaction is eligible for seller protection. For information, see [PayPal Seller Protection for Merchants](https://www.paypal.com/us/webapps/mpp/security/seller-protection). Values: ELIGIBLE, PARTIALLY_ELIGIBLE, NOT_ELIGIBLE.
- `dispute_categories` (array of string): An array of conditions that are covered for the transaction.

### link_schema-2

The request data or link target.

- `additionalItems` (object): Any additional items.
- `dependencies` (object): Any Dependencies.
- `items` (object): An item.
- `definitions` (object): Definitions.
- `patternProperties` (object): The pattern properties.
- `properties` (object): Properties.
- `allOf` (array of object): An array of sub-schemas. The data must validate against all sub-schemas.
- `anyOf` (array of object): An array of sub-schemas. The data must validate against one or more sub-schemas.
- `oneOf` (array of object): An array of sub-schemas. The data must validate against one sub-schema.
- `not` (object): Not.
- `links` (array of object): An array of links.
- `fragmentResolution` (string): The fragment resolution.
- `media` (object): The media type and context-encoding scheme.
- `pathStart` (string): To apply this schema to the instances' URIs, start the URIs with this value.

### link_description-2

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.
- `title` (string): The link title.
- `mediaType` (string): The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.
- `encType` (string): The media type in which to submit the request data.
- `schema` (link_schema-2 + object): 
- `targetSchema` (link_schema-2 + object): 

### activity_timestamps

The date and time stamps that are common to authorized payment, captured payment, and refund transactions.

- `create_time` (date_time + object): 
- `update_time` (date_time + object): 

### authorization

The authorized payment transaction.

### related_ids

Identifiers related to a specific resource.

- `order_id` (string): Order ID related to the resource.
- `authorization_id` (string): Authorization ID related to the resource.
- `capture_id` (string): Capture ID related to the resource.

### supplementary_data

The supplementary data.

- `related_ids` (related_ids + object): 

### authorization-2

The authorized payment transaction.

### supplementary_purchase_data

The capture identification-related fields. Includes the invoice ID, custom ID, note to payer, and soft descriptor.

- `invoice_id` (string): The API caller-provided external invoice number for this order. Appears in both the payer's transaction history and the emails that the payer receives.
- `note_to_payer` (string): An informational note about this settlement. Appears in both the payer's transaction history and the emails that the payer receives.

### platform_fee

The platform or partner fee, commission, or brokerage fee that is associated with the transaction. Not a separate or isolated transaction leg from the external perspective. The platform fee is limited in scope and is always associated with the original payment for the purchase unit.

- `amount` (money + object, required): 
- `payee` (payee_base + object): 

### disbursement_mode

The funds that are held on behalf of the merchant.

Allowed values: `INSTANT`, `DELAYED`

### payment_instruction

Any additional payment instructions to be consider during payment processing. This processing instruction is applicable for Capturing an order or Authorizing an Order.

- `platform_fees` (array of platform_fee + object): An array of various fees, commissions, tips, or donations. This field is only applicable to merchants that been enabled for PayPal Complete Payments Platform for Marketplaces and Platforms capability.
- `disbursement_mode` (disbursement_mode + object): 
- `payee_pricing_tier_id` (string): This field is only enabled for selected merchants/partners to use and provides the ability to trigger a specific pricing rate/plan for a payment transaction. The list of eligible 'payee_pricing_tier_id' would be provided to you by your Account Manager. Specifying values other than the one provided to you by your account manager would result in an error.
- `payee_receivable_fx_rate_id` (string): FX identifier generated returned by PayPal to be used for payment processing in order to honor FX rate (for eligible integrations) to be used when amount is settled/received into the payee account.

### capture_request

Captures either a portion or the full authorized amount of an authorized payment.

### capture_status_details

The details of the captured payment status.

- `reason` (string): The reason why the captured payment status is `PENDING` or `DENIED`. Values: BUYER_COMPLAINT, CHARGEBACK, ECHECK, INTERNATIONAL_WITHDRAWAL, OTHER, PENDING_REVIEW, RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION, REFUNDED, TRANSACTION_APPROVED_AWAITING_FUNDING, UNILATERAL, VERIFICATION_REQUIRED, DECLINED_BY_RISK_FRAUD_FILTERS.

### capture_status

The status and status details of a captured payment.

- `status` (string): The status of the captured payment. Values: COMPLETED, DECLINED, PARTIALLY_REFUNDED, PENDING, REFUNDED, FAILED.
- `status_details` (capture_status_details + object): 

### exchange_rate

The exchange rate that determines the amount to convert from one currency to another currency.

- `source_currency` (currency_code + object): 
- `target_currency` (currency_code + object): 
- `value` (string): The target currency amount. Equivalent to one unit of the source currency. Formatted as integer or decimal value with one to 15 digits to the right of the decimal point.

### seller_receivable_breakdown

The detailed breakdown of the capture activity. This is not available for transactions that are in pending state.

- `gross_amount` (money + object, required): 
- `paypal_fee` (money + object): 
- `paypal_fee_in_receivable_currency` (money + object): 
- `net_amount` (money + object): 
- `receivable_amount` (money + object): 
- `exchange_rate` (exchange_rate + object): 
- `platform_fees` (array of platform_fee + object): An array of platform or partner fees, commissions, or brokerage fees that associated with the captured payment.

### processor_response

The processor response information for payment requests, such as direct credit card transactions.

- `avs_code` (string): The address verification code for Visa, Discover, Mastercard, or American Express transactions. Values: A, B, C, D, E, F, G, I, M, N, P, R, S, U, W.
- `cvv_code` (string): The card verification value code for for Visa, Discover, Mastercard, or American Express. Values: E, I, M, N, P, S, U, X, All others, 0, 1, 2, 3, 4.
- `response_code` (string): Processor response code for the non-PayPal payment processor errors. Values: 0000, 00N7, 0100, 0390, 0500, 0580, 0800, 0880, 0890, 0960, 0R00, 1000, 10BR, 1300, 1310.
- `payment_advice_code` (string): The declined payment transactions might have payment advice codes. The card networks, like Visa and Mastercard, return payment advice codes. Values: 01, 02, 03, 04, 21, 22, 24, 25, 26, 27, 28, 29, 30, 40, 43.

### capture

A captured payment.

### capture-2

A captured payment.

### reauthorize_request

Reauthorizes an authorized PayPal account payment, by ID. To ensure that funds are still available, reauthorize a payment after its initial three-day honor period expires. You can reauthorize a payment only once from days four to 29.

If 30 days have transpired since the date of the original authorization, you must create an authorized payment instead of reauthorizing the original authorized payment.

A reauthorized payment itself has a new honor period of three days.

You can reauthorize an authorized payment once. The allowed amount depends on context and geography, for example in US it is up to 115% of the original authorized amount, not to exceed an increase of $75 USD.

Supports only the `amount` request parameter.

- `amount` (money + object): 

### payment_instruction-2

Any additional payments instructions during refund payment processing. This object is only applicable to merchants that have been enabled for PayPal Commerce Platform for Marketplaces and Platforms capability. Please speak to your account manager if you want to use this capability.

- `platform_fees` (array of platform_fee + object): Specifies the amount that the API caller will contribute to the refund being processed. The amount needs to be lower than platform_fees amount originally captured or the amount that is remaining if multiple refunds have been processed. This field is only applicable to merchants that have been enabled for PayPal Commerce Platform for Marketplaces and Platforms capability. Please speak to your …

### refund_request

Refunds a captured payment, by ID. For a full refund, include an empty request body. For a partial refund, include an `amount` object in the request body.

- `amount` (money + object): 
- `custom_id` (string): The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports. The pattern is defined by an external party and supports Unicode.
- `invoice_id` (string): The API caller-provided external invoice ID for this order. The pattern is defined by an external party and supports Unicode.
- `note_to_payer` (string): The reason for the refund. Appears in both the payer's transaction history and the emails that the payer receives. The pattern is defined by an external party and supports Unicode.
- `payment_instruction` (payment_instruction-2 + object): 

### refund_status_details

The details of the refund status.

- `reason` (string): The reason why the refund has the `PENDING` or `FAILED` status. Values: ECHECK.

### refund_status

The refund status with details.

- `status` (string): The status of the refund. Values: CANCELLED, FAILED, PENDING, COMPLETED.
- `status_details` (refund_status_details + object): 

### net_amount_breakdown_item

The net amount. Returned when the currency of the refund is different from the currency of the PayPal account where the merchant holds their funds.

- `payable_amount` (money + object): 
- `converted_amount` (money + object): 
- `exchange_rate` (exchange_rate + object): 

### refund

The refund information.

### guid

A Globally Unique Identifier (GUID) value.

### find_eligible_methods_request_customer_channel

Channel through which the request is being posted.

- `browser_type` (string): The browser used by the customer. Example: Safari, Chrome, etc.
- `client_os` (string): The operating system on the device used by the customer. Example: iOS 16.5, Android 30, etc.
- `device_type` (string): The type of device used by the customer. Example: Mobile, Desktop, Tablet, etc.

### find_eligible_methods_request_customer

Customer who is making a purchase from the merchant/partner.

- `country_code` (country_code-2 + object): 
- `channel` (find_eligible_methods_request_customer_channel + object): 
- `id` (string): The unique ID for a customer in merchant's or partner's system of records.
- `email` (email_address): 
- `phone` (phone-2 + object): 

### eligibility_purchase_unit_request

Purchase unit for payment eligibility.

- `amount` (amount_with_breakdown): 
- `payee` (payee): 

### payment_method

Set of unique payment methods.

Allowed values: `PAYPAL`, `VENMO`, `PAYPAL_CREDIT`, `PAYPAL_PAY_LATER`

### find_eligible_methods_request_preferences

Preferences of merchant/partner consuming the API.

- `payment_flow` (string): This field specifies the payment flow, expected to provide a hint about which payment action the customer is intending to perform. Values: ONE_TIME_PAYMENT, RECURRING_PAYMENT, VAULT_WITH_PAYMENT, VAULT_WITHOUT_PAYMENT.
- `include_account_details` (boolean): If this value is set to true, response will include confirmation if the customer has PayPal and/or Venmo accounts if they are eligible payment methods. Value defaults to false.
- `include_vault_tokens` (boolean): If this value is set to true, response will include vaulted token information if the eligible funding source has any instrument vaulted for the customer. Value defaults to false.
- `payment_source_constraint` (object): Payment source constraint defines the payment methods that needs to be included/excluded for eligibility assessment. If not passed, all payment methods will be assessed for eligibility.

### find_eligible_methods_request

Request to get list of eligible payment methods.

- `customer` (find_eligible_methods_request_customer): 
- `purchase_units` (array of eligibility_purchase_unit_request): Array of purchase units.
- `preferences` (find_eligible_methods_request_preferences): 

### credit_product_button_code

The button code corresponding to a particular product or set of products. The values followed are defined by the SDK team.

Allowed values: `CREDIT`, `PAYLATER`, `PAY_IN_3`, `PAY_IN_4`

### payment_method_common

Common response fields for all payment methods.

- `can_be_vaulted` (boolean): Indicates if the payment method can be vaulted or not. A true value indicates the payment method can be vaulted using our vaults product. If false, vaulting is not currently supported for this payment method.
- `country_code` (country_code-2 + object): 
- `product_code` (credit_product_button_code + object): 

### payment_method_eligible_in_paypal_network

Flag that indicates if the customer is in the PayPal network. This value will be included in the response if the include_account_details flag is set to "true" in the API request.

### paypal

Response for PayPal.

### venmo

Response for Venmo.

### payment_methods

List of payment methods.

- `paypal` (paypal + object): 
- `venmo` (venmo + object): 
- `paypal_credit` (payment_method_common + object): 
- `paypal_pay_later` (payment_method_common + object): 

### payer_base

The customer who approves and pays for the order. The customer is also known as the payer.

- `email_address` (email + object): 
- `payer_id` (account_id-2 + object): 

### venmo_payment_token_info

Payment Token info for Venmo payment source.

- `user_name` (string): The Venmo username, as chosen by the user.

### payment_token

Vaulted instrument for a payment-method.

- `id` (string): The PayPal-generated ID for the vault token.
- `payment_source` (object): The vaulted payment method details.
- `links` (array of link_description): An array of related [HATEOAS links](/api/rest/responses/#hateoas).

### find_eligible_methods_response

Eligible payment methods along with applicable vault tokens, if requested.

- `eligible_methods` (payment_methods + object): 
- `payment_tokens` (array of payment_token + object): Payment tokens for vaulted instruments, if available. This object will be included only if include_vault_tokens is set to true in the request.

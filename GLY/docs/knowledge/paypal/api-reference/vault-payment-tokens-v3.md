---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/vault_payment_tokens_v3.json
title: "PayPal Payment Method Tokens API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Payment Method Tokens (version 3.4)

The Payment Method Tokens API saves payment methods so payers don't have to enter details for future transactions. Payers can check out faster or pay without being present after they agree to save a payment method.

The API associates a payment method with a temporary setup token. Pass the setup token to the API to exchange the setup token for a permanent token.

The permanent token represents a payment method that's saved to the vault. This token can be used repeatedly for checkout or recurring transactions such as subscriptions.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List all payment tokens

`GET /v3/vault/payment-tokens`

Returns all payment tokens for a customer.

Parameters:

- `customer_id` (query, required): A unique identifier representing a specific customer in merchant's/partner's system or records.
- `page_size` (query): A non-negative, non-zero integer indicating the maximum number of results to return at one time.
- `page` (query): A non-negative, non-zero integer representing the page of the results.
- `total_required` (query): A boolean indicating total number of items (total_items) and pages (total_pages) are expected to be returned in the response.

Responses:

- 200: Successful execution.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 500: An internal server error has occurred.

### Create payment token for a given payment source

`POST /v3/vault/payment-tokens`

Creates a Payment Token from the given payment source and adds it to the Vault of the associated customer.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 3 hours.

Request body: payment_token_request

Responses:

- 200: Idempotent response for a successful creation of payment token.
- 201: A successful creation of payment token.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 404: Request contains reference to resources that do not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.

### Retrieve a payment token

`GET /v3/vault/payment-tokens/{id}`

Returns a readable representation of vaulted payment source associated with the payment token id.

Parameters:

- `id` (path, required): ID of the setup token.

Responses:

- 200: Successful execution.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.

### Delete payment token

`DELETE /v3/vault/payment-tokens/{id}`

Delete the payment token associated with the payment token id.

Parameters:

- `id` (path, required): ID of the setup token.

Responses:

- 204: The server has successfully executed the method, but there is no entity body to return.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 500: An internal server error has occurred.

### Create a setup token

`POST /v3/vault/setup-tokens`

Creates a Setup Token from the given payment source and adds it to the Vault of the associated customer.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 3 hours.

Request body: setup_token_request

Responses:

- 200: Idempotent response for a successful creation of setup token.
- 201: A successful creation of setup token.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.

### Retrieve a setup token

`GET /v3/vault/setup-tokens/{id}`

Returns a readable representation of temporarily vaulted payment source associated with the setup token id.

Parameters:

- `id` (path, required): ID of the setup token.

Responses:

- 200: Found requested setup-token, returned a payment method associated with the token.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.

## Schemas

### account_id

The account identifier for a PayPal account.

### apple_pay_payment_token_response

A resource representing a response for Apple Pay.

- `card` (object): The payment card to be used to fund a payment. Can be a credit or debit card.

### billing_cycle

The billing cycle providing details of the billing frequency, amount, duration and if the billing cycle is a free, discounted or regular billing cycle. The sequence of the billing cycle will be in the following order - free trial billing cycle(s), discounted trial billing cycle(s), regular billing cycle(s).

- `tenure_type` (string, required): The tenure type of the billing cycle identifies if the billing cycle is a trial(free or discounted) or regular billing cycle. Values: REGULAR, TRIAL.
- `pricing_scheme` (pricing_scheme): The active pricing scheme for this billing cycle. A free trial billing cycle does not require a pricing scheme.
- `frequency` (frequency): The frequency details for this billing cycle.
- `total_cycles` (integer): The number of times this billing cycle gets executed. Trial billing cycles can only be executed a finite number of times (value between `1` and `999` for `total_cycles`). Regular billing cycles can be executed infinite times (value of `0` for `total_cycles`) or a finite number of times (value between `1` and `999` for `total_cycles`).
- `sequence` (integer): The order in which this cycle is to run among other billing cycles. For example, a trial billing cycle has a `sequence` of `1` while a regular billing cycle has a `sequence` of `2`, so that trial cycle runs before the regular cycle.
- `start_date` (date_no_time): The start date for the billing cycle, in YYYY-MM-DD. This field should be not be provided if the billing cycle starts at the time of checkout. When this field is not provided, the billing cycle amount will be included in any data validations confirming that the total provided by the merchant match the sum of individual items due at the time of checkout. Only one billing cycle (with sequence equal …

### billing_cycle_list

An array of billing cycles for trial billing and regular billing. A plan can have at most two trial cycles and only one regular cycle.

### bin_details

Bank Identification Number (BIN) details used to fund a payment.

- `bin` (string): The Bank Identification Number (BIN) signifies the number that is being used to identify the granular level details (except the PII information) of the card.
- `issuing_bank` (string): The issuer of the card instrument.
- `bin_country_code` (country_code-2): The [two-character ISO-3166-1 country code](/docs/integration/direct/rest/country-codes/) of the bank.
- `products` (products_list): 

### card_brand

The card network or brand. Applies to credit, debit, gift, and payment cards.

Allowed values: `VISA`, `MASTERCARD`, `DISCOVER`, `AMEX`, `SOLO`, `JCB`, `STAR`, `DELTA`, `SWITCH`, `MAESTRO`, `CB_NATIONALE`, `CONFIGOGA`, `CONFIDIS`, `ELECTRON`, `CETELEM`, `CHINA_UNION_PAY`, `DINERS`, `ELO`, `HIPER`, `HIPERCARD`, `RUPAY`, `GE`, `SYNCHRONY`, `EFTPOS`, `UNKNOWN`

### card_response

Full representation of a Card Payment Token including network token.

### card_response_entity

Full representation of a Card Payment Token.

- `name` (string): The card holder's name as it appears on the card.
- `last_digits` (string): The last digits of the payment card.
- `brand` (card_brand): The card brand or network. Typically used in the response.
- `expiry` (date_year_month): The card expiration year and month, in [Internet date format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `billing_address` (object): Address request details.
- `verification_status` (card_verification_status): Card Verification status.
- `verification` (card_verification_details): 
- `network_transaction_reference` (network_transaction_reference_response): 
- `authentication_result` (object): Results of Authentication such as 3D Secure.
- `bin_details` (bin_details): Bank Identification Number (BIN) details used to fund a payment.
- `type` (card_type): The payment card type.

### card_type

Type of card. i.e Credit, Debit and so on.

Allowed values: `CREDIT`, `DEBIT`, `PREPAID`, `STORE`, `UNKNOWN`

### card_verification_details

Card Verification details including the authorization details and 3D SECURE details.

- `network_transaction_id` (string): DEPRECATED. This field is DEPRECATED. Please find the network transaction id data in the 'id' field under the 'network_transaction_reference' object instead of the 'verification' object.
- `date` (string): DEPRECATED. This field is DEPRECATED. Please find the date data in the 'date' field under the 'network_transaction_reference' object instead of the 'verification' object.
- `network` (card_brand): DEPRECATED. This field is DEPRECATED. Please find the network data in the 'network' field under the 'network_transaction_reference' object instead of the 'verification' object.
- `time` (date_time): DEPRECATED. This field is DEPRECATED. Please find the time data in the 'time' field under the 'network_transaction_reference' object instead of the 'verification' object.
- `amount` (money): The amount used for card verification.
- `processor_response` (object): The processor response information for payment requests, such as direct credit card transactions.
- `three_d_secure` (object): DEPRECATED. This field is DEPRECATED. Please find the 3D secure authentication data in the 'three_d_secure' object under the 'authentication_result' object instead of the 'verification' object.

### card_verification_method

The verification method of the card.

Allowed values: `SCA_WHEN_REQUIRED`, `SCA_ALWAYS`

### card_verification_status

Verification status of Card.

Allowed values: `VERIFIED`, `FAILED`

### country_code

The [2-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### country_code-2

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### customer

This object defines a customer in your system. Use it to manage customer profiles, save payment methods and contact details.

- `id` (merchant_partner_customer_id): The unique ID for a customer in merchant's or partner's system of records.
- `merchant_customer_id` (string): Merchants and partners may already have a data-store where their customer information is persisted. Use merchant_customer_id to associate the PayPal-generated customer.id to your representation of a customer.

### customer_vault_payment_tokens_response

Collection of payment tokens saved for a given customer.

- `total_items` (integer): Total number of items.
- `total_pages` (integer): Total number of pages.
- `customer` (object): This object defines a customer in your system. Use it to manage customer profiles, save payment methods and contact details.
- `payment_tokens` (payment_token_response_list): 
- `links` (link_description_list): 

### date_no_time

The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### date_year_month

The year and month, in ISO-8601 `YYYY-MM` date format. See [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links) that are either relevant to the issue by providing additional information or offering potential resolutions.

### definitions-payment_source

The payment method to vault with the instrument details.

- `card` (object): A Resource representing a request to vault a Card.
- `token` (token_id_request): 

### email

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### enrolled

Status of Authentication eligibility.

Allowed values: `Y`, `N`, `U`, `B`

### error

The error details.

- `name` (string, required): The human-readable, unique name of the error.
- `message` (string, required): The message that describes the error.
- `debug_id` (string, required): The PayPal internal ID. Used for correlation purposes.
- `details` (error_details_list): 
- `links` (error_definitions-link_description_list): 

### error_400

Request is not well-formed, syntactically incorrect, or violates schema.

- `name` (string):  Values: INVALID_REQUEST.
- `message` (string):  Values: Request is not well-formed, syntactically incorrect, or violates schema..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_401

Authentication failed due to missing Authorization header, or invalid authentication credentials.

- `name` (string):  Values: AUTHENTICATION_FAILURE.
- `message` (string):  Values: Authentication failed due to missing authorization header, or invalid authentication credentials..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_403

The client is not authorized to access this resource, although it may have valid credentials.

- `name` (string):  Values: NOT_AUTHORIZED.
- `message` (string):  Values: Authorization failed due to insufficient permissions..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_404

The server has not found anything matching the request URI. This either means that the URI is incorrect or the resource is not available.

- `name` (string):  Values: RESOURCE_NOT_FOUND.
- `message` (string):  Values: The specified resource does not exist..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_409

The server has detected a conflict while processing this request.

- `name` (string):  Values: RESOURCE_CONFLICT.
- `message` (string):  Values: The server has detected a conflict while processing this request..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_415

The server does not support the request payload's media type.

- `name` (string):  Values: UNSUPPORTED_MEDIA_TYPE.
- `message` (string):  Values: The server does not support the request payload's media type..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_422

The requested action cannot be performed and may require interaction with APIs or processes outside of the current request. This is distinct from a 500 response in that there are no systemic problems limiting the API from performing the request.

- `name` (string):  Values: UNPROCESSABLE_ENTITY.
- `message` (string):  Values: The requested action could not be performed, semantically incorrect, or failed business validation..
- `details` (array of error_details): 
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_500

This is either a system or application error, and generally indicates that although the client appeared to provide a correct request, something unexpected has gone wrong on the server.

- `name` (string):  Values: INTERNAL_SERVER_ERROR.
- `message` (string):  Values: An internal server error occurred..
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_503

The server is temporarily unable to handle the request, for example, because of planned maintenance or downtime.

- `name` (string):  Values: SERVICE_UNAVAILABLE.
- `message` (string):  Values: Service Unavailable..
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `links` (array of error_link_description): An array of request-related [HATEOAS links](https://en.wikipedia.org/wiki/HATEOAS).

### error_default

The default error response.

### error_definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### error_details

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `location` (error_location): 
- `issue` (string, required): The unique, fine-grained application-level error code.
- `description` (string): The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.

### error_details-2

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `location` (string): The location of the field that caused the error. Value is `body`, `path`, or `query`.
- `issue` (string, required): The unique, fine-grained application-level error code.
- `links` (definitions-link_description_list): 
- `description` (string): The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.

### error_details_list

An array of additional details about the error.

### error_link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, PATCH.

### error_location

The location of the field that caused the error. Value is `body`, `path`, or `query`.

Allowed values: `body`, `path`, `query`

### experience_context

Customizes the Vault creation flow experience for your customers.

- `brand_name` (string): The label that overrides the business name in the PayPal account on the PayPal site. The pattern is defined by an external party and supports Unicode.
- `locale` (language): The BCP 47-formatted locale of pages that the PayPal vaulting experience shows. PayPal supports a five-character code. For example, `DA-DK`, `HE-IL`, `ID-ID`, `JA-JP`, `NO-NO`, `PT-BR`, `RU-RU`, `SV-SE`, `TH-TH`, `ZH-CN`, `ZH-HK`, or `ZH-TW`.
- `return_url` (string): The URL where the customer is redirected after customer approves leaves the flow. It is a required field for contingency flows like PayPal wallet, 3DS.
- `cancel_url` (string): The URL where the customer is redirected after customer cancels or leaves the flow. It is a required field for contingency flows like PayPal wallet, 3DS.
- `shipping_preference` (string): The shipping preference. This only applies to PayPal payment source. Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `vault_instruction` (vault_instruction): Vault Instruction on action to be performed after a successful payer approval.

### frequency

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/api/rest/reference/country-codes/) or [M49 region code](https://unstats.un.org/unsd/methodology/m49/).

### link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of related [HATEOAS links](/api/rest/responses/#hateoas).

### merchant_partner_customer_id

The unique ID for a customer generated by PayPal.

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).

### network_token_entity

### network_transaction_reference_entity

Previous network transaction reference including id and network.

- `id` (string, required): Transaction reference id returned by the scheme. For Visa and Amex, this is the "Tran id" field in response. For MasterCard, this is the "BankNet reference id" field in response. For Discover, this is the "NRID" field in response. The pattern we expect for this field from Visa/Amex/CB/Discover is numeric, Mastercard/BNPP is alphanumeric and Paysecure is alphanumeric with special character -.
- `date` (string): The date that the transaction was authorized by the scheme. This field may not be returned for all networks. MasterCard refers to this field as "BankNet reference date.
- `network` (card_brand): Name of the card network through which the transaction was routed.
- `time` (date_time): The date and time when the instrument was verified.

### network_transaction_reference_request

### network_transaction_reference_response

Previous network transaction reference including id in response.

### one_time_charges

The one-time charge info at the time of checkout.

- `setup_fee` (money): The setup fee for the recurring plan.
- `shipping_amount` (money): The shipping amount due at the time of checkout.
- `taxes` (money): The taxes due at the time of checkout.
- `product_price` (money): The product price for any one-time product purchased at the time of checkout.
- `subtotal` (money): The subtotal at the time of checkout. This is calculated by using the formula x + y + z where x is first-recurring-charge, y is setup-fee and z is item-price.
- `total_amount` (money, required): The total amount at the time of checkout. This is calculated by using the formula x + y + z where x is subtotal, y is shipping-amount and z is taxes.

### pares_status

Transactions status result identifier. The outcome of the issuer's authentication.

Allowed values: `Y`, `N`, `U`, `A`, `C`, `R`, `D`, `I`

### payer_base

The customer who approves and pays for the order. The customer is also known as the payer.

- `email_address` (email): The email address of the payer.
- `payer_id` (account_id): The PayPal-assigned ID for the payer.

### payment_source

The vaulted payment method details.

- `card` (card_response): 
- `paypal` (paypal_wallet_response): 
- `venmo` (venmo_response): 
- `apple_pay` (apple_pay_payment_token_response): 

### payment_token_request

Payment Token Request where the `source` defines the type of instrument to be stored.

- `customer` (object): This object defines a customer in your system. Use it to manage customer profiles, save payment methods and contact details.
- `payment_source` (definitions-payment_source, required): 

### payment_token_response

Full representation of a saved payment token.

- `id` (vault_id): The PayPal-generated ID for the vault token.
- `customer` (customer): Customer in merchant's or partner's system of records.
- `payment_source` (payment_source): 
- `links` (link_description_list): 

### payment_token_response_list

### payment_token_status

The status of the payment token.

Allowed values: `CREATED`, `PAYER_ACTION_REQUIRED`, `APPROVED`, `VAULTED`, `TOKENIZED`

### paypal_wallet_request

A resource representing a request to vault PayPal Wallet.

### paypal_wallet_response

### phone

The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### phone_type

The phone type.

Allowed values: `FAX`, `HOME`, `MOBILE`, `OTHER`, `PAGER`

### phone_with_type

The phone information.

- `phone_type` (phone_type): 
- `phone_number` (object, required): The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

### plan

The merchant level Recurring Billing plan metadata for the Billing Agreement.

- `billing_cycles` (billing_cycle_list, required): 
- `product` (product_override): Product details associated with any one-time product purchase.
- `one_time_charges` (one_time_charges, required): Price and currency for any one-time charges due at plan signup.
- `name` (string): Name of the recurring plan.

### pricing_scheme

The pricing scheme details.

- `price` (money): The price the customer will be charged based on the pricing model
- `pricing_model` (string, required): The pricing model for the billing cycle. Values: FIXED, VARIABLE, AUTO_RELOAD.
- `reload_threshold_amount` (money): The threshold amount on which the reload charge would be triggered. This will be associated with the account-balance where if the account-balance goes below this amount then customer would incur reload charge.

### product_override

### products

This value provides the category of the BIN.

### products_list

The type of card product assigned to the BIN by the issuer. These values are defined by the issuer and may change over time. Some examples include: PREPAID_GIFT, CONSUMER, CORPORATE.

### setup_token_request

Setup Token Request where the `source` defines the type of instrument to be stored.

- `customer` (object): This object defines a customer in your system. Use it to manage customer profiles, save payment methods and contact details.
- `payment_source` (object, required): The payment method to vault with the instrument details.

### setup_token_response

Minimal representation of a cached setup token.

- `id` (vault_id): The PayPal-generated ID for the vault token.
- `customer` (object): This object defines a customer in your system. Use it to manage customer profiles, save payment methods and contact details.
- `status` (payment_token_status): The status of the payment token.
- `payment_source` (object): The setup payment method details.
- `links` (link_description_list): 

### three_d_secure_authentication_response

Results of 3D Secure Authentication.

- `authentication_status` (pares_status): The outcome of the issuer's authentication.
- `enrollment_status` (enrolled): Status of authentication eligibility.

### three_d_secure_authentication_response-2

Results of 3D Secure Authentication.

### token_id_request

The Tokenized Payment Source representing a Request to Vault a Token.

- `id` (string, required): The PayPal-generated ID for the token.
- `type` (string, required): The tokenization method that generated the ID. Values: SETUP_TOKEN.

### vault_id

The PayPal-generated ID for the vault token.

### vault_instruction

Vault Instruction on action to be performed after a successful payer approval.

Allowed values: `ON_CREATE_PAYMENT_TOKENS`, `ON_PAYER_APPROVAL`

### venmo_request

### venmo_response

### wallet_base

Resource consolidating common request and response attributes for vaulting a Digital Wallet.

- `description` (string): The description displayed to the consumer on the approval flow for a digital wallet, as well as on the merchant view of the payment token management experience. exp: PayPal.com.
- `usage_pattern` (string): Expected business/charge model for the billing agreement. Values: IMMEDIATE, DEFERRED, RECURRING_PREPAID, RECURRING_POSTPAID, THRESHOLD_PREPAID, THRESHOLD_POSTPAID, UNSCHEDULED_POSTPAID, UNSCHEDULED_PREPAID, SUBSCRIPTION_PREPAID, SUBSCRIPTION_POSTPAID, INSTALLMENT_POSTPAID, INSTALLMENT_PREPAID.
- `shipping` (object): The shipping details.
- `permit_multiple_payment_tokens` (boolean): Create multiple payment tokens for the same payer, merchant/platform combination. Use this when the customer has not logged in at merchant/platform. The payment token thus generated, can then also be used to create the customer account at merchant/platform. Use this also when multiple payment tokens are required for the same payer, different customer at merchant/platform. This helps to identify …
- `usage_type` (string): The usage type associated with a digital wallet payment token. Values: MERCHANT, PLATFORM.
- `customer_type` (string): The customer type associated with a digital wallet payment token. This is to indicate whether the customer acting on the merchant / platform is either a business or a consumer. Values: CONSUMER, BUSINESS.

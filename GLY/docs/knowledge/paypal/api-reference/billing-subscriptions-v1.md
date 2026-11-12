---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/billing_subscriptions_v1.json
title: "PayPal Subscriptions API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Subscriptions (version 1.8)

You can use billing plans and subscriptions to create subscriptions that process recurring PayPal payments for physical or digital goods, or services. A plan includes pricing and billing cycle information that defines the amount and frequency of charge for a subscription. You can also define a fixed plan, such as a $5 basic plan or a volume- or graduated-based plan with pricing tiers based on the quantity purchased. For more information, see Subscriptions Overview.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List plans

`GET /v1/billing/plans`

Lists billing plans.

Parameters:

- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `product_id` (query): Filters the response by a Product ID.
- `page_size` (query): The number of items to return in the response.
- `page` (query): A non-zero integer which is the start index of the entire list of items to return in the response. The combination of `page=1` and `page_size=20` returns the first 20 items. The combination of `page=2` and `page_size=20` returns the next 20 items.
- `total_required` (query): Indicates whether to show the total count in the response.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists billing plans.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The default response.

### Create plan

`POST /v1/billing/plans`

Creates a plan that defines pricing and billing cycle details for subscriptions.

Parameters:

- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `PayPal-Request-Id` (header): The server stores keys for 72 hours.

Request body: plan_request_POST

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows billing plan details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows billing plan details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Show plan details

`GET /v1/billing/plans/{id}`

Shows details for a plan, by ID.

Parameters:

- `id` (path, required): The ID of the subscription.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows plan details.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The default response.

### Update plan

`PATCH /v1/billing/plans/{id}`

Updates a plan with the `CREATED` or `ACTIVE` status. For an `INACTIVE` plan, you can make only status updates.
You can patch these attributes and objects:Attribute or objectOperations`description`replace`payment_preferences.auto_bill_outstanding`replace`taxes.percentage`replace`payment_preferences.payment_failure_threshold`replace`payment_preferences.setup_fee`replace`payment_preferences.setup_fee_failure_action`replace`name`replace

Parameters:

- `id` (path, required): The ID of the subscription.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Activate plan

`POST /v1/billing/plans/{id}/activate`

Activates a plan, by ID.

Parameters:

- `id` (path, required): The ID of the subscription.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Deactivate plan

`POST /v1/billing/plans/{id}/deactivate`

Deactivates a plan, by ID.

Parameters:

- `id` (path, required): The ID of the subscription.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Update pricing

`POST /v1/billing/plans/{id}/update-pricing-schemes`

Updates pricing for a plan. For example, you can update a regular billing cycle from $5 per month to $7 per month.

Parameters:

- `id` (path, required): The ID of the subscription.

Request body: update_pricing_schemes_list_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Create subscription

`POST /v1/billing/subscriptions`

Creates a subscription.

Parameters:

- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `PayPal-Request-Id` (header): The server stores keys for 72 hours.

Request body: subscription_request_post

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows subscription details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows subscription details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Show subscription details

`GET /v1/billing/subscriptions/{id}`

Shows details for a subscription, by ID.

Parameters:

- `id` (path, required): The ID of the subscription.
- `fields` (query): List of fields that are to be returned in the response. Possible value for fields are last_failed_payment and plan.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows subscription details.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The default response.

### Update subscription

`PATCH /v1/billing/subscriptions/{id}`

Updates a subscription which could be in `ACTIVE` or `SUSPENDED` status. You can override plan level default attributes by providing customised values for plan path in the patch request.

- You cannot update attributes that have already completed (Example - trial cycles can’t be updated if completed). 
- Once overridden, changes to plan resource will not impact subscription. 
- Any price update will not impact billing cycles within next 10 days (Applicable only for subscriptions funded by PayPal account). 
 Following are the fields eligible for patch.Attribute or objectOperations`billing_info.outstanding_balance`replace`custom_id`add,replace`plan.billing_cycles[@sequence==n].
pricing_scheme.fixed_price`add,replace`plan.billing_cycles[@sequence==n].
pricing_scheme.tiers`replace`plan.billing_cycles[@sequence==n].
total_cycles`replace`plan.payment_preferences.
auto_bill_outstanding`replace`plan.payment_preferences.
payment_failure_threshold`replace`plan.taxes.inclusive`add,replace`plan.taxes.percentage`add,replace`shipping_amount`add,replace`start_time`replace`subscriber.shipping_address`add,replace`subscriber.payment_source (for subscriptions funded
by card payments)`replace

Parameters:

- `id` (path, required): The ID of the subscription.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Revise plan or quantity of subscription

`POST /v1/billing/subscriptions/{id}/revise`

Updates the quantity of the product or service in a subscription. You can also use this method to switch the plan and update the `shipping_amount`, `shipping_address` values for the subscription. This type of update requires the buyer's consent.

Parameters:

- `id` (path, required): The ID of the subscription.

Request body: subscription_revise_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows subscription details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Suspend subscription

`POST /v1/billing/subscriptions/{id}/suspend`

Suspends the subscription.

Parameters:

- `id` (path, required): The ID of the subscription.

Request body: subscription_suspend_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Cancel subscription

`POST /v1/billing/subscriptions/{id}/cancel`

Cancels the subscription.

Parameters:

- `id` (path, required): The ID of the subscription.

Request body: subscription_cancel_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Activate subscription

`POST /v1/billing/subscriptions/{id}/activate`

Activates the subscription.

Parameters:

- `id` (path, required): The ID of the subscription.

Request body: subscription_activate_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Capture authorized payment on subscription

`POST /v1/billing/subscriptions/{id}/capture`

Captures an authorized payment from the subscriber on the subscription.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 72 hours.
- `id` (path, required): The ID of the subscription.

Request body: subscription_capture_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows subscription details.
- 202: Request Accepted.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### List transactions for subscription

`GET /v1/billing/subscriptions/{id}/transactions`

Lists transactions for a subscription.

Parameters:

- `id` (path, required): The ID of the subscription.
- `start_time` (query, required): The start time of the range of transactions to list.
- `end_time` (query, required): The end time of the range of transactions to list.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows subscription details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The default response.

## Schemas

### 400

- `details` (array of object): 

### 401

- `details` (array of object): 

### 403

- `details` (array of object): 

### 404

- `details` (array of object): 

### 422

- `details` (array of object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object): 

### account_id

The account identifier for a PayPal account.

### amount_with_breakdown

The breakdown details for the amount. Includes the gross, tax, fee, and shipping amounts.

- `gross_amount` (money, required): The amount for this transaction.
- `total_item_amount` (money): The item total for the transaction.
- `fee_amount` (money): The fee details for the transaction.
- `shipping_amount` (money): The shipping amount for the transaction.
- `tax_amount` (money): The tax amount for the transaction.
- `net_amount` (money): The net amount that the payee receives for this transaction in their PayPal account. The net amount is computed as `gross_amount` minus the `paypal_fee`.

### application_context

The application context, which customizes the payer experience during the subscription approval process with PayPal.

- `brand_name` (string): The label that overrides the business name in the PayPal account on the PayPal site.
- `locale` (language): The BCP 47-formatted locale of pages that the PayPal payment experience shows. PayPal supports a five-character code. For example, `da-DK`, `he-IL`, `id-ID`, `ja-JP`, `no-NO`, `pt-BR`, `ru-RU`, `sv-SE`, `th-TH`, `zh-CN`, `zh-HK`, or `zh-TW`.
- `shipping_preference` (string): The location from which the shipping address is derived. Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `user_action` (string): Configures the label name to `Continue` or `Subscribe Now` for subscription consent experience. Values: CONTINUE, SUBSCRIBE_NOW.
- `payment_method` (object): The customer and merchant payment preferences.
- `return_url` (string, required): The URL where the customer is redirected after the customer approves the payment.
- `cancel_url` (string, required): The URL where the customer is redirected after the customer cancels the payment.

### authentication_response

Results of Authentication such as 3D Secure.

- `liability_shift` (liability_shift): 
- `three_d_secure` (three_d_secure_authentication_response): 

### billing_cycle

The billing cycle details.

- `pricing_scheme` (pricing_scheme): The active pricing scheme for this billing cycle. A free trial billing cycle does not require a pricing scheme.
- `frequency` (frequency, required): The frequency details for this billing cycle.
- `tenure_type` (string, required): The tenure type of the billing cycle. In case of a plan having trial cycle, only 2 trial cycles are allowed per plan. Values: REGULAR, TRIAL.
- `sequence` (integer, required): The order in which this cycle is to run among other billing cycles. For example, a trial billing cycle has a `sequence` of `1` while a regular billing cycle has a `sequence` of `2`, so that trial cycle runs before the regular cycle.
- `total_cycles` (integer): The number of times this billing cycle gets executed. Trial billing cycles can only be executed a finite number of times (value between `1` and `999` for `total_cycles`). Regular billing cycles can be executed infinite times (value of `0` for `total_cycles`) or a finite number of times (value between `1` and `999` for `total_cycles`).

### billing_cycle_list

An array of billing cycles for trial billing and regular billing. A plan can have at most two trial cycles and only one regular cycle.

### billing_cycle_override

The billing cycle details to override at subscription level. The subscription billing cycle definition has to adhere to the plan billing cycle definition.

- `pricing_scheme` (pricing_scheme): The active pricing scheme for this billing cycle. A free trial billing cycle does not require a pricing scheme.
- `sequence` (integer, required): The order in which this cycle is to run among other billing cycles. For example, a trial billing cycle has a `sequence` of `1` while a regular billing cycle has a `sequence` of `2`, so that trial cycle runs before the regular cycle.
- `total_cycles` (integer): The number of times this billing cycle gets executed. Trial billing cycles can only be executed a finite number of times (value between `1` and `999` for `total_cycles`). Regular billing cycles can be executed infinite times (value of `0` for `total_cycles`) or a finite number of times (value between `1` and `999` for `total_cycles`).

### billing_cycle_override_list

An array of billing cycles for trial billing and regular billing. The subscription billing cycle definition has to adhere to the plan billing cycle definition.

### bin_details

Bank Identification Number (BIN) details used to fund a payment.

- `bin` (string): The Bank Identification Number (BIN) signifies the number that is being used to identify the granular level details (except the PII information) of the card.
- `issuing_bank` (string): The issuer of the card instrument.
- `bin_country_code` (country_code-2): The [two-character ISO-3166-1 country code](/docs/integration/direct/rest/country-codes/) of the bank.
- `products` (products_list): 

### card_attributes

Additional attributes associated with the use of this card.

- `customer` (customer): 
- `vault` (vault_instruction_base): Instruction to vault the card based on the specified strategy.
- `verification` (card_verification): Instruction to optionally verify the card based on the specified strategy.

### card_attributes_response

Additional attributes associated with the use of this card.

- `vault` (vault_response): 

### card_brand

The card network or brand. Applies to credit, debit, gift, and payment cards.

Allowed values: `VISA`, `MASTERCARD`, `DISCOVER`, `AMEX`, `SOLO`, `JCB`, `STAR`, `DELTA`, `SWITCH`, `MAESTRO`, `CB_NATIONALE`, `CONFIGOGA`, `CONFIDIS`, `ELECTRON`, `CETELEM`, `CHINA_UNION_PAY`, `DINERS`, `ELO`, `HIPER`, `HIPERCARD`, `RUPAY`, `GE`, `SYNCHRONY`, `UNKNOWN`

### card_brand_list

Array of brands or networks associated with the card.

### card_from_request

Representation of card details as received in the request.

- `expiry` (date_year_month): The card expiration year and month, in [Internet date format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `last_digits` (string): The last digits of the payment card.

### card_response

The payment card to use to fund a payment. Card can be a credit or debit card.

- `name` (string): The card holder's name as it appears on the card.
- `last_digits` (string): The last digits of the payment card.
- `brand` (card_brand): The card brand or network. Typically used in the response.
- `available_networks` (card_brand_list): 
- `type` (card_type): The payment card type.
- `authentication_result` (authentication_response): 
- `attributes` (card_attributes_response): 
- `from_request` (card_from_request): 
- `expiry` (date_year_month): The card expiration year and month, in [Internet date format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `bin_details` (bin_details): Bank Identification Number (BIN) details used to fund a payment.

### card_response_with_billing_address

### card_type

Type of card. i.e Credit, Debit and so on.

Allowed values: `CREDIT`, `DEBIT`, `PREPAID`, `STORE`, `UNKNOWN`

### card_verification

The API caller can opt in to verify the card through PayPal offered verification services (e.g. Smart Dollar Auth, 3DS).

- `method` (string): The method used for card verification. Values: SCA_ALWAYS, SCA_WHEN_REQUIRED, 3D_SECURE, AVS_CVV.

### country_code

The [2-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### country_code-2

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### customer

The details about a customer in PayPal's system of record.

- `id` (merchant_partner_customer_id): 
- `email_address` (email): Email address of the buyer as provided to the merchant or on file with the merchant. Email Address is required if you are processing the transaction using PayPal Guest Processing which is offered to select partners and merchants. For all other use cases we do not expect partners/merchant to send email_address of their customer.
- `phone` (phone_with_type): The phone number of the buyer as provided to the merchant or on file with the merchant. The `phone.phone_number` supports only `national_number`.

### cycle_execution

The regular and trial execution details for a billing cycle.

- `tenure_type` (string, required): The type of the billing cycle. Values: REGULAR, TRIAL.
- `sequence` (integer, required): The order in which to run this cycle among other billing cycles.
- `cycles_completed` (integer, required): The number of billing cycles that have completed.
- `cycles_remaining` (integer): For a finite billing cycle, cycles_remaining is the number of remaining cycles. For an infinite billing cycle, cycles_remaining is set as 0.
- `current_pricing_scheme_version` (integer): The active pricing scheme version for the billing cycle.
- `total_cycles` (integer): The number of times this billing cycle gets executed. Trial billing cycles can only be executed a finite number of times (value between `1` and `999` for `total_cycles`). Regular billing cycles can be executed infinite times (value of `0` for `total_cycles`) or a finite number of times (value between `1` and `999` for `total_cycles`).

### cycle_execution_list

The trial and regular billing executions.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### date_year_month

The year and month, in ISO-8601 `YYYY-MM` date format. See [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### definitions-link_description_list

An array of request-related HATEOAS links.

### email

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### enrolled

Status of Authentication eligibility.

Allowed values: `Y`, `N`, `U`, `B`

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

### error_details

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `location` (error_location): 
- `issue` (string, required): The unique, fine-grained application-level error code.
- `description` (string): The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.

### error_link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, PATCH.

### error_location

The location of the field that caused the error. Value is `body`, `path`, or `query`.

Allowed values: `body`, `path`, `query`

### failed_payment_details

The details for the failed payment of the subscription.

- `amount` (money, required): The failed payment amount.
- `time` (date_time, required): The date and time when the failed payment was made, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `reason_code` (string): The reason code for the payment failure. Values: PAYMENT_DENIED, INTERNAL_SERVER_ERROR, PAYEE_ACCOUNT_RESTRICTED, PAYER_ACCOUNT_RESTRICTED, PAYER_CANNOT_PAY, SENDING_LIMIT_EXCEEDED, TRANSACTION_RECEIVING_LIMIT_EXCEEDED, CURRENCY_MISMATCH.
- `next_payment_retry_time` (date_time): The time when the retry attempt for the failed payment occurs, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### frequency

The frequency of the billing cycle.

- `interval_unit` (string, required): The interval at which the subscription is charged or billed. Values: DAY, WEEK, MONTH, YEAR.
- `interval_count` (integer): The number of intervals after which a subscriber is billed. For example, if the `interval_unit` is `DAY` with an `interval_count` of `2`, the subscription is billed once every two days. The following table lists the maximum allowed values for the `interval_count` for each `interval_unit`:`Interval unit`Maximum interval count`DAY`365`WEEK`52`MONTH`12`YEAR`1

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/api/rest/reference/country-codes/) or [M49 region code](https://unstats.un.org/unsd/methodology/m49/).

### last_payment_details

The details for the last payment.

### liability_shift

Liability shift indicator. The outcome of the issuer's authentication.

Allowed values: `NO`, `POSSIBLE`, `UNKNOWN`

### link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### merchant_inventory

### merchant_partner_customer_id

The unique ID for a customer generated by PayPal.

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).

### name

The name of the party.

- `prefix` (string): The prefix, or title, to the party's name.
- `given_name` (string): When the party is a person, the party's given, or first, name.
- `surname` (string): When the party is a person, the party's surname or family name. Also known as the last name. Required when the party is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.
- `middle_name` (string): When the party is a person, the party's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.
- `suffix` (string): The suffix for the party's name.
- `full_name` (string): When the party is a person, the party's full name.

### pares_status

Transactions status result identifier. The outcome of the issuer's authentication.

Allowed values: `Y`, `N`, `U`, `A`, `C`, `R`, `D`, `I`

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (object): The value to apply. The `remove`, `copy`, and `move` operations do not require a value. Since JSON Patch allows any type for `value`, the `type` property is not specified.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### payee_payment_method_preference

The merchant-preferred payment methods.

Allowed values: `UNRESTRICTED`, `IMMEDIATE_PAYMENT_REQUIRED`

### payer_base

The customer who approves and pays for the order. The customer is also known as the payer.

- `email_address` (email): The email address of the payer.
- `payer_id` (account_id): The PayPal-assigned ID for the payer.

### payment_preferences

The payment preferences for a subscription.

- `auto_bill_outstanding` (boolean): Indicates whether to automatically bill the outstanding amount in the next billing cycle.
- `setup_fee` (money): The initial set-up fee for the service.
- `setup_fee_failure_action` (string): The action to take on the subscription if the initial payment for the setup fails. Values: CONTINUE, CANCEL.
- `payment_failure_threshold` (integer): The maximum number of payment failures before a subscription is suspended. For example, if `payment_failure_threshold` is `2`, the subscription automatically updates to the `SUSPEND` state if two consecutive payments fail.

### payment_preferences_override

The payment preferences to override at subscription level.

- `auto_bill_outstanding` (boolean): Indicates whether to automatically bill the outstanding amount in the next billing cycle.
- `setup_fee` (money): The initial set-up fee for the service.
- `setup_fee_failure_action` (string): The action to take on the subscription if the initial payment for the setup fails. Values: CONTINUE, CANCEL.
- `payment_failure_threshold` (integer): The maximum number of payment failures before a subscription is suspended. For example, if `payment_failure_threshold` is `2`, the subscription automatically updates to the `SUSPEND` state if two consecutive payments fail.

### payment_source

The payment source definition. To be eligible to create subscription using debit or credit card, you will need to sign up here (https://www.paypal.com/bizsignup/entry/product/ppcp). Please note, its available only for non-3DS cards and for merchants in US and AU regions.

- `card` (object): The payment card to use to fund a payment. Can be a credit or debit card.

### payment_source_response

The payment source used to fund the payment.

- `card` (card_response_with_billing_address): 

### percentage

The percentage, as a fixed-point, signed decimal number. For example, define a 19.99% interest rate as `19.99`.

### phone_type

The phone type.

Allowed values: `FAX`, `HOME`, `MOBILE`, `OTHER`, `PAGER`

### phone_with_type

The phone information.

- `phone_type` (phone_type): 
- `phone_number` (object, required): The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

### plan

The plan details.

- `id` (string): The unique PayPal-generated ID for the plan.
- `product_id` (string): The ID for the product.
- `name` (string): The plan name.
- `status` (string): The plan status. Values: CREATED, INACTIVE, ACTIVE.
- `description` (string): The detailed description of the plan.
- `billing_cycles` (billing_cycle_list): 
- `payment_preferences` (payment_preferences): 
- `taxes` (taxes): 
- `quantity_supported` (boolean): Indicates whether you can subscribe to this plan by providing a quantity for the goods or service.
- `create_time` (date_time): The date and time when the plan was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `update_time` (date_time): The date and time when the plan was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `links` (link_description_list): 

### plan_collection

The list of plans with details.

- `plans` (plan_list): 
- `total_items` (integer): The total number of items.
- `total_pages` (integer): The total number of pages.
- `links` (link_description_list): 

### plan_list

An array of plans.

### plan_override

An inline plan object to customise the subscription. You can override plan level default attributes by providing customised values for the subscription in this object.

- `billing_cycles` (billing_cycle_override_list): 
- `payment_preferences` (payment_preferences_override): 
- `taxes` (taxes_override): 

### plan_request_POST

The create plan request details.

- `product_id` (string, required): The ID of the product created through Catalog Products API.
- `name` (string, required): The plan name.
- `status` (string): The initial state of the plan. Allowed input values are CREATED and ACTIVE. Values: CREATED, INACTIVE, ACTIVE.
- `description` (string): The detailed description of the plan.
- `billing_cycles` (billing_cycle_list, required): 
- `payment_preferences` (payment_preferences, required): 
- `taxes` (taxes): 
- `quantity_supported` (boolean): Indicates whether you can subscribe to this plan by providing a quantity for the goods or service.

### plans.activate-422

- `details` (array of object | object): 

### plans.create-400

- `details` (array of object | object | object | object | object | object | object): 

### plans.deactivate-422

- `details` (array of object | object): 

### plans.patch-400

- `details` (array of object | object | object | object | object | object): 

### plans.patch-422

- `details` (array of object | object): 

### plans.update-pricing-schemes-400

- `details` (array of object | object): 

### plans.update-pricing-schemes-422

- `details` (array of object | object | object | object | object | object | object | object | object | object): 

### pricing_scheme

The pricing scheme details.

- `version` (integer): The version of the pricing scheme.
- `fixed_price` (money): The fixed amount to charge for the subscription. The changes to fixed amount are applicable to both existing and future subscriptions. For existing subscriptions, payments within 10 days of price change are not affected.
- `pricing_model` (string): The pricing model for tiered plan. The `tiers` parameter is required. Values: VOLUME, TIERED.
- `tiers` (pricing_tier_list): 
- `create_time` (date_time): The date and time when this pricing scheme was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `update_time` (date_time): The date and time when this pricing scheme was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### pricing_tier

The pricing tier details.

- `starting_quantity` (string, required): The starting quantity for the tier.
- `ending_quantity` (string): The ending quantity for the tier. Optional for the last tier.
- `amount` (money, required): The pricing amount for the tier.

### pricing_tier_list

An array of pricing tiers which are used for billing volume/tiered plans. pricing_model field has to be specified.

### products

This value provides the category of the BIN.

### products_list

The type of card product assigned to the BIN by the issuer. These values are defined by the issuer and may change over time. Some examples include: PREPAID_GIFT, CONSUMER, CORPORATE.

### shipping_detail

The shipping details.

- `name` (object): The name of the party.
- `type` (string): A classification for the method of purchase fulfillment (e.g shipping, in-store pickup, etc). Either `type` or `options` may be present, but not both. Values: SHIPPING, PICKUP_IN_PERSON, PICKUP_IN_STORE, PICKUP_FROM_PERSON.
- `options` (shipping_option_list): 
- `address` (object): The portable international postal address. Maps to [AddressValidationMetadata](https://github.com/googlei18n/libaddressinput/wiki/AddressValidationMetadata) and HTML 5.1 [Autofilling form controls: the autocomplete attribute](https://www.w3.org/TR/html51/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute).

### shipping_option

The options that the payee or merchant offers to the payer to ship or pick up their items.

- `id` (string, required): A unique ID that identifies a payer-selected shipping option.
- `label` (string, required): A description that the payer sees, which helps them choose an appropriate shipping option. For example, `Free Shipping`, `USPS Priority Shipping`, `Expédition prioritaire USPS`, or `USPS yōuxiān fā huò`. Localize this description to the payer's locale.
- `type` (shipping_type): A classification for the method of purchase fulfillment.
- `amount` (money): The shipping cost for the selected option.
- `selected` (boolean, required): If the API request sets `selected = true`, it represents the shipping option that the payee or merchant expects to be pre-selected for the payer when they first view the `shipping.options` in the PayPal Checkout experience. As part of the response if a `shipping.option` contains `selected=true`, it represents the shipping option that the payer selected during the course of checkout with PayPal. …

### shipping_option_list

An array of shipping options that the payee or merchant offers to the payer to ship or pick up their items.

### shipping_type

A classification for the method of purchase fulfillment.

Allowed values: `SHIPPING`, `PICKUP`, `PICKUP_IN_STORE`, `PICKUP_FROM_PERSON`

### store_in_vault_instruction

Defines how and when the payment source gets vaulted.

Allowed values: `ON_SUCCESS`

### subscriber

### subscriber_request

### subscription

### subscription_activate_request

The activate subscription request details.

- `reason` (string): The reason for activation of a subscription. Required to reactivate the subscription.

### subscription_billing_info

The billing details for the subscription. If the subscription was or is active, these fields are populated.

- `outstanding_balance` (money, required): The total pending bill amount, to be paid by the subscriber.
- `cycle_executions` (cycle_execution_list): 
- `last_payment` (last_payment_details): The details for the last payment of the subscription.
- `next_billing_time` (date_time): The next date and time for billing this subscription, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `final_payment_time` (date_time): The date and time when the final billing cycle occurs, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `failed_payments_count` (integer, required): The number of consecutive payment failures. Resets to `0` after a successful payment. If this reaches the `payment_failure_threshold` value, the subscription updates to the `SUSPENDED` state.
- `last_failed_payment` (failed_payment_details): The details for the last failed payment of the subscription.

### subscription_cancel_request

The cancel subscription request details.

- `reason` (string, required): The reason for the cancellation of a subscription.

### subscription_capture_request

The charge amount from the subscriber.

- `note` (string, required): The reason or note for the subscription charge.
- `capture_type` (string, required): The type of capture. Values: OUTSTANDING_BALANCE.
- `amount` (money, required): The amount of the outstanding balance. This value cannot be greater than the current outstanding balance amount.

### subscription_request_post

The create subscription request details.

- `plan_id` (string, required): The ID of the plan.
- `start_time` (date_time): The date and time when the subscription started, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `quantity` (string): The quantity of the product in the subscription.
- `shipping_amount` (money): The shipping charges.
- `subscriber` (subscriber_request): 
- `auto_renewal` (boolean): DEPRECATED. Indicates whether the subscription auto-renews after the billing cycles complete.
- `application_context` (application_context): 
- `custom_id` (string): The custom id for the subscription. Can be invoice id.
- `plan` (plan_override): An inline plan object to customise the subscription. You can override plan level default attributes by providing customised values for the subscription in this object.
- `merchant_inventory` (merchant_inventory): Merchant's inventory identifier details for the WPS hosted button.

### subscription_revise_request

The request to update the quantity of the product or service in a subscription. You can also use this method to switch the plan and update the `shipping_amount` and `shipping_address` values for the subscription. This type of update requires the buyer's consent.

- `plan_id` (string): The unique PayPal-generated ID for the plan.
- `quantity` (string): The quantity of the product or service in the subscription.
- `shipping_amount` (money): The shipping charges.
- `shipping_address` (shipping_detail): The shipping address of the subscriber.
- `application_context` (object): The application context, which customizes the payer experience during the subscription approval process with PayPal.
- `plan` (plan_override): An inline plan object to customise the subscription. You can override plan level default attributes by providing customised values for the subscription in this object. Any existing overrides will not be carried forward during subscription revise.

### subscription_revise_response

The response to a request to update the quantity of the product or service in a subscription. You can also use this method to switch the plan and update the `shipping_amount` and `shipping_address` values for the subscription. This type of update requires the buyer's consent.

- `plan_id` (string): The unique PayPal-generated ID for the plan.
- `quantity` (string): The quantity of the product or service in the subscription.
- `shipping_amount` (money): The shipping charges.
- `shipping_address` (shipping_detail): The shipping address of the subscriber.
- `plan` (plan_override): An inline plan object to customise the subscription. You can override plan level default attributes by providing customised values for the subscription in this object. Any existing overrides will not be carried forward during subscription revise.
- `plan_overridden` (boolean): Indicates whether the subscription has overridden any plan attributes.
- `links` (subscription_revise_response_definitions-link_description_list): 

### subscription_revise_response_definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### subscription_status

The subscription status details.

- `status` (string): The status of the subscription. Values: APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED.
- `status_change_note` (string): The reason or notes for the status of the subscription.
- `status_update_time` (date_time): 

### subscription_suspend_request

The suspend subscription request details.

- `reason` (string, required): The reason for suspension of the Subscription.

### subscriptions.activate-400

- `details` (array of object): 

### subscriptions.activate-422

- `details` (array of object | object | object | object | object): 

### subscriptions.cancel-400

- `details` (array of object): 

### subscriptions.cancel-422

- `details` (array of object | object): 

### subscriptions.capture-400

- `details` (array of object | object | object | object): 

### subscriptions.capture-422

- `details` (array of object | object | object | object | object | object | object | object): 

### subscriptions.create-400

- `details` (array of object | object | object | object | object | object | object | object | object): 

### subscriptions.create-422

- `details` (array of object | object | object | object | object | object | object | object | object | object | object | object | object | object): 

### subscriptions.patch-400

- `details` (array of object | object | object | object | object | object | object | object | object | object | object): 

### subscriptions.patch-422

- `details` (array of object | object | object | object | object | object | object | object | object | object | object | object | object | object | object): 

### subscriptions.revise-400

- `details` (array of object | object | object | object | object | object): 

### subscriptions.revise-404

- `details` (array of object): 

### subscriptions.revise-422

- `details` (array of object | object | object | object | object | object | object | object | object | object | object): 

### subscriptions.suspend-400

- `details` (array of object): 

### subscriptions.suspend-422

- `details` (array of object | object): 

### subscriptions.transactions-400

- `details` (array of object | object | object): 

### taxes

The tax details.

- `percentage` (percentage, required): The tax percentage on the billing amount.
- `inclusive` (boolean): Indicates whether the tax was already included in the billing amount.

### taxes_override

The tax details.

- `percentage` (percentage): The tax percentage on the billing amount.
- `inclusive` (boolean): Indicates whether the tax was already included in the billing amount.

### three_d_secure_authentication_response

Results of 3D Secure Authentication.

- `authentication_status` (pares_status): The outcome of the issuer's authentication.
- `enrollment_status` (enrolled): Status of authentication eligibility.

### transaction

The transaction details.

- `status` (string): The status of the captured payment. Values: COMPLETED, DECLINED, PARTIALLY_REFUNDED, PENDING, REFUNDED, FAILED.
- `id` (string, required): The PayPal-generated transaction ID.
- `amount_with_breakdown` (amount_with_breakdown, required): 
- `payer_name` (name): The name of the customer.
- `payer_email` (email_address): The email ID of the customer.
- `time` (date_time, required): The date and time when the transaction was processed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### transaction_list

An array of transactions.

### transactions_list

The list transactions for a subscription request details.

- `transactions` (transaction_list): 
- `total_items` (integer): The total number of items.
- `total_pages` (integer): The total number of pages.
- `links` (link_description_list): 

### update_pricing_scheme_request

The update pricing scheme request details.

- `billing_cycle_sequence` (integer, required): The billing cycle sequence.
- `pricing_scheme` (pricing_scheme, required): 

### update_pricing_scheme_request_list

An array of pricing schemes.

### update_pricing_schemes_list_request

The update pricing scheme request details.

- `pricing_schemes` (update_pricing_scheme_request_list, required): 

### vault_instruction_base

Basic vault instruction specification that can be extended by specific payment sources that supports vaulting.

- `store_in_vault` (store_in_vault_instruction): 

### vault_response

The details about a saved payment source.

- `id` (string): The PayPal-generated ID for the saved payment source.
- `status` (string): The vault status. Values: VAULTED, CREATED, APPROVED.
- `customer` (object): The details about a customer in PayPal's system of record.
- `links` (definitions-link_description_list): 

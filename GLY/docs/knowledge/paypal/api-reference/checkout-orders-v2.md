---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/checkout_orders_v2.json
title: "PayPal Orders API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Orders (version 2.32)

An order represents a payment between two or more parties. Use the Orders API to create, update, retrieve, authorize, and capture orders.

## Servers

- Server for https scheme.: https://api-m.paypal.com

## Operations

### Create order

`POST /v2/checkout/orders`

Creates an order. Merchants and partners can add Level 2 and 3 data to payments to reduce risk and payment processing costs. For more information about processing payments, see checkout or multiparty checkout.Note: For error handling and troubleshooting, see Orders v2 errors.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 6 hours. The API callers can request the times to up to 72 hours by speaking to their Account Manager. It is mandatory for all single-step create order calls (E.g. Create Order Request with payment source information like Card, PayPal.vault_id, …
- `PayPal-Partner-Attribution-Id` (header): PayPal Partner can send a PayPal-Partner-Attribution-Id request header with the value that they have been assigned by the PayPal Partner program. This value is known as a BN Code. In order to reward such partners (through partner programs), all the activities (including API calls) that they are …
- `PayPal-Client-Metadata-Id` (header): A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: order_request

Responses:

- 200: A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows order details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that includes by default a minimal response with the ID, status, and HATEOAS links. If you require the complete order resource representation, you must pass the `Prefer: return=representation` request header. …
- 202: The request has been accepted for processing, but the processing has not been completed yet. The server returns the HTTP `202 Accepted` status code to indicate that the request is valid and will be handled asynchronously.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Show order details

`GET /v2/checkout/orders/{id}`

Shows details for an order, by ID.Note: For error handling and troubleshooting, see Orders v2 errors.

Parameters:

- `id` (path, required): The ID of the order for which to show details.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.
- `fields` (query): A comma-separated list of fields that should be returned for the order. Valid filter field is `payment_source`.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows order details.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 500: Internal Server Error.
- default: Default response.

### Update order

`PATCH /v2/checkout/orders/{id}`

Updates an order with a `CREATED` or `APPROVED` status. You cannot update an order with the `COMPLETED` status.

To make an update, you must provide a `reference_id`. If you omit this value with an order that contains only one purchase unit, PayPal sets the value to `default` which enables you to use the path: `\"/purchase_units/@reference_id=='default'/{attribute-or-object}\"`. Merchants and partners can add Level 2 and 3 data to payments to reduce risk and payment processing costs. For more information about processing payments, see checkout or multiparty checkout.Note: For error handling and troubleshooting, see Orders v2 errors.Patchable attributes or objects:

AttributeOpNotes`intent`replace`payer`replace, addUsing replace op for `payer` will replace the whole `payer` object with the value sent in request.`purchase_units`replace, add`purchase_units[].custom_id`replace, add, remove`purchase_units[].description`replace, add, remove`purchase_units[].payee.email`replace`purchase_units[].shipping.name`replace, add`purchase_units[].shipping.email_address`replace, add`purchase_units[].shipping.phone_number`replace, add`purchase_units[].shipping.options`replace, add`purchase_units[].shipping.address`replace, add`purchase_units[].shipping.type`replace, add`purchase_units[].soft_descriptor`replace, remove`purchase_units[].amount`replace`purchase_units[].items`replace, add, remove`purchase_units[].invoice_id`replace, add, remove`purchase_units[].payment_instruction`replace`purchase_units[].payment_instruction.disbursement_mode`replaceBy default, `disbursement_mode` is `INSTANT`.`purchase_units[].payment_instruction.payee_receivable_fx_rate_id`replace, add, remove`purchase_units[].payment_instruction.platform_fees`replace, add, remove`purchase_units[].supplementary_data.airline`replace, add, remove`purchase_units[].supplementary_data.card`replace, add, remove`application_context.client_configuration`replace, add

Parameters:

- `id` (path, required): The ID of the order to update.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: patch_request

Responses:

- 204: No Content.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Confirm the Order

`POST /v2/checkout/orders/{id}/confirm-payment-source`

Payer confirms their intent to pay for the the Order with the given payment source.

Parameters:

- `PayPal-Client-Metadata-Id` (header): A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..
- `id` (path, required): The ID of the order for which the payer confirms their intent to pay.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …

Request body: confirm_order_request

Responses:

- 200: A successful request indicates that the payment source was added to the Order. A successful request returns the HTTP `200 OK` status code with a JSON response body that shows order details.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Authorize payment for order

`POST /v2/checkout/orders/{id}/authorize`

Authorizes payment for an order. To successfully authorize payment for an order, the buyer must first approve the order or a valid payment_source must be provided in the request. A buyer can approve the order upon being redirected to the rel:approve URL that was returned in the HATEOAS links in the create order response.Note: For error handling and troubleshooting, see Orders v2 errors.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 6 hours. The API callers can request the times to up to 72 hours by speaking to their Account Manager. It is mandatory for all single-step create order calls (E.g. Create Order Request with payment source information like Card, PayPal.vault_id, …
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `PayPal-Client-Metadata-Id` (header): A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..
- `id` (path, required): The ID of the order for which to authorize.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: order_authorize_request

Responses:

- 200: A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows authorized payment details.
- 201: A successful response to a non-idempotent request returns the HTTP `201 Created` status code with a JSON response body that shows authorized payment details. If a duplicate response is retried, returns the HTTP `200 OK` status code. By default, the response is minimal. If you need the complete …
- 202: The request has been accepted for processing, but the processing has not been completed yet. The server returns the HTTP `202 Accepted` status code to indicate that the request is valid and will be handled asynchronously.
- 207: The request was successfully processed, but the result contains mixed outcomes. When an order includes multiple purchase units, the server returns the HTTP `207 Multi-Status` code to indicate that one or more purchase units were processed successfully while others failed. The response body provides …
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 409: The request could not be completed due to a conflict with the current state of the resource. The HTTP `409 Conflict` status code is returned when the requested operation is not allowed because the order or one or more purchase units are in a state that prevents the operation.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Capture payment for order

`POST /v2/checkout/orders/{id}/capture`

Captures payment for an order. To successfully capture payment for an order, the buyer must first approve the order or a valid payment_source must be provided in the request. A buyer can approve the order upon being redirected to the rel:approve URL that was returned in the HATEOAS links in the create order response.Note: For error handling and troubleshooting, see Orders v2 errors.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 6 hours. The API callers can request the times to up to 72 hours by speaking to their Account Manager. It is mandatory for all single-step create order calls (E.g. Create Order Request with payment source information like Card, PayPal.vault_id, …
- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `PayPal-Client-Metadata-Id` (header): A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..
- `id` (path, required): The ID of the order for which to capture a payment.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: order_capture_request

Responses:

- 200: A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows captured payment details.
- 201: A successful response to a non-idempotent request returns the HTTP `201 Created` status code with a JSON response body that shows captured payment details. If a duplicate response is retried, returns the HTTP `200 OK` status code. By default, the response is minimal. If you need the complete …
- 202: The request has been accepted for processing, but the processing has not been completed yet. The server returns the HTTP `202 Accepted` status code to indicate that the request is valid and will be handled asynchronously.
- 207: The request was successfully processed, but the result contains mixed outcomes. When an order includes multiple purchase units, the server returns the HTTP `207 Multi-Status` code to indicate that one or more purchase units were processed successfully while others failed. The response body provides …
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 409: The request could not be completed due to a conflict with the current state of the resource. The HTTP `409 Conflict` status code is returned when the requested operation is not allowed because the order or one or more purchase units are in a state that prevents the operation.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Add tracking information for an Order.

`POST /v2/checkout/orders/{id}/track`

Adds tracking information for an Order.

Parameters:

- `id` (path, required): The ID of the order that the tracking information is associated with.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: order_tracker_request

Responses:

- 200: A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows tracker details.
- 201: A successful response to a non-idempotent request returns the HTTP `201 Created` status code with a JSON response body that shows tracker details. If a duplicate response is retried, returns the HTTP `200 OK` status code.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Update or cancel tracking information for an order

`PATCH /v2/checkout/orders/{id}/trackers/{tracker_id}`

Updates or cancels the tracking information for a PayPal order, by ID. Updatable attributes or objects:

AttributeOpNotes`items`replaceUsing replace op for `items` will replace the entire `items` object with the value sent in request.`notify_payer`replace, add`status`replaceOnly patching status to CANCELLED is currently supported.

Parameters:

- `id` (path, required): The ID of the order that the tracking information is associated with.
- `tracker_id` (path, required): The order tracking ID.
- `Authorization` (header): Holds authorization information for external API calls.
- `PayPal-Auth-Assertion` (header): Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.

Request body: patch_request

Responses:

- 204: No Content.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

### Receive updated order information via callback URL

`POST /v2/checkout/orders/order-update-callback`

The documentation for this 'endpoint' is different from the other endpoints under v2 Orders. For this endpoint the role of client and server is reversed. The client sending the request is PayPal, and the server sending the response is the merchant. In the request, PayPal will send the buyer's redacted shipping address and selected shipping option to the callback URL defined the create order request. The response from the merchant will update the Orders resource.

Parameters:

- `Authorization` (header): Holds authorization information for external API calls.

Request body: order_update_callback_request

Responses:

- 200: The callback to merchant was successful.
- 400: The request is not well-formed, is syntactically incorrect, or violates the schema.
- 401: Unauthorized.
- 403: Forbidden.
- 422: The requested action could not be completed, was semantically incorrect, or failed business validation.
- 500: Internal Server Error.
- default: Default response.

## Schemas

### guid

A Globally Unique Identifier (GUID) value.

### standard_header_schema

Standard headers are generally less restrictive in structure due to historical precedent across browsers, etc. This is a common schema for use in defining most standard headers.

### checkout_payment_intent

The intent to either capture payment immediately or authorize a payment for an order after order creation.

Allowed values: `CAPTURE`, `AUTHORIZE`

### email

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### account_id

The account identifier for a PayPal account.

### payer_base

The customer who approves and pays for the order. The customer is also known as the payer.

- `email_address` (email + object): 
- `payer_id` (account_id + object): 

### name

The name of the party.

- `prefix` (string): The prefix, or title, to the party's name.
- `given_name` (string): When the party is a person, the party's given, or first, name.
- `surname` (string): When the party is a person, the party's surname or family name. Also known as the last name. Required when the party is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.
- `middle_name` (string): When the party is a person, the party's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.
- `suffix` (string): The suffix for the party's name.
- `full_name` (string): When the party is a person, the party's full name.

### phone_type

The phone type.

Allowed values: `FAX`, `HOME`, `MOBILE`, `OTHER`, `PAGER`

### phone_number_without_country_code

A structured representation of a phone number conforming to the international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en),requiring only the national_number field.

- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).

### phone_with_type

The phone information.

- `phone_type` (phone_type): 
- `phone_number` (phone_number_without_country_code + object, required): 

### date_no_time

The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.

### tax_info

The tax ID of the customer. The customer is also known as the payer. Both `tax_id` and `tax_id_type` are required.

- `tax_id` (string, required): The customer's tax ID value.
- `tax_id_type` (string, required): The customer's tax ID type. Values: BR_CPF, BR_CNPJ.

### country_code

The [2-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### address_portable

The portable international postal address. Maps to [AddressValidationMetadata](https://github.com/googlei18n/libaddressinput/wiki/AddressValidationMetadata) and HTML 5.1 [Autofilling form controls: the autocomplete attribute](https://www.w3.org/TR/html51/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute).

- `address_line_1` (string): The first line of the address, such as number and street, for example, `173 Drury Lane`. Needed for data entry, and Compliance and Risk checks. This field needs to pass the full address.
- `address_line_2` (string): The second line of the address, for example, a suite or apartment number.
- `address_line_3` (string): The third line of the address, if needed. Examples include a street complement for Brazil, direction text, such as `next to Walmart`, or a landmark in an Indian address.
- `admin_area_4` (string): The neighborhood, ward, or district. This is smaller than `admin_area_level_3` or `sub_locality`. Value is:

- The postal sorting code that is used in Guernsey and many French territories, such as French Guiana.
- The fine-grained administrative levels in China.
- `admin_area_3` (string): The sub-locality, suburb, neighborhood, or district. This is smaller than `admin_area_level_2`. Value is:

- Brazil. Suburb, *bairro*, or neighborhood.
- India. Sub-locality or district. Street name information isn't always available, but a sub-locality or district can be a very small area.
- `admin_area_2` (string): A city, town, or village. Smaller than `admin_area_level_1`.
- `admin_area_1` (string): The highest-level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. This data is formatted for postal delivery, for example, `CA` and not `California`. Value, by country, is:

- UK. A county.
- US. A state.
- Canada. A province.
- Japan. A prefecture.
- Switzerland. A *kanton*.
- `postal_code` (string): The postal code, which is the ZIP code or equivalent. Typically required for countries with a postal code or an equivalent. See [postal code](https://en.wikipedia.org/wiki/Postal_code).
- `country_code` (country_code, required): 
- `address_details` (object): The non-portable additional address details include fine-grain address information for Compliance, Risk, and other scenarios. This isn't portable with common third-party and open source applications. This can include data that is redundant with core fields. For example, `address_portable.address_line_1` is usually a combination of `address_details.street_number`, `street_name`, and `street_type`.

### country_code-2

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### payer

The customer who approves and pays for the order. The customer is also known as the payer.

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).

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

### payee_base

The details for the merchant who receives the funds and fulfills the order. The merchant is also known as the payee.

- `email_address` (email + object): 
- `merchant_id` (account_id + object): 

### phone

The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### payee

The merchant who receives the funds and fulfills the order. The merchant is also known as the payee.

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

### universal_product_code

The Universal Product Code of the item.

- `type` (string, required): The Universal Product Code type. Values: UPC-A, UPC-B, UPC-C, UPC-D, UPC-E, UPC-2, UPC-5.
- `code` (string, required): The UPC product code of the item.

### pricing_scheme

The pricing scheme details.

- `price` (money + object): 
- `pricing_model` (string, required): The pricing model for the billing cycle. Values: FIXED, VARIABLE, AUTO_RELOAD.
- `reload_threshold_amount` (money + object): 

### billing_cycle

The billing cycle providing details of the billing frequency, amount, duration and if the billing cycle is a free, discounted or regular billing cycle. The sequence of the billing cycle will be in the following order - free trial billing cycle(s), discounted trial billing cycle(s), regular billing cycle(s).

- `tenure_type` (string, required): The tenure type of the billing cycle identifies if the billing cycle is a trial(free or discounted) or regular billing cycle. Values: REGULAR, TRIAL.
- `pricing_scheme` (pricing_scheme + object): 
- `total_cycles` (integer): The number of times this billing cycle gets executed. Trial billing cycles can only be executed a finite number of times (value between `1` and `999` for `total_cycles`). Regular billing cycles can be executed infinite times (value of `0` for `total_cycles`) or a finite number of times (value between `1` and `999` for `total_cycles`).
- `sequence` (integer): The order in which this cycle is to run among other billing cycles. For example, a trial billing cycle has a `sequence` of `1` while a regular billing cycle has a `sequence` of `2`, so that trial cycle runs before the regular cycle.
- `start_date` (date_no_time + object): 

### order_billing_plan

Metadata for merchant-managed recurring billing plans. Valid only during the saved payment method token or billing agreement creation.

- `billing_cycles` (array of billing_cycle, required): An array of billing cycles for trial billing and regular billing. A plan can have at most two trial cycles and only one regular cycle.
- `setup_fee` (money + object): 
- `name` (string): Name of the recurring plan.

### item_request

The details for the items to be purchased.

- `name` (string, required): The item name or title. This field supports up to 3000 characters, but any content beyond 127 characters (including spaces) will be truncated. The 127 character limit is reflected in the response representation of this field.
- `unit_amount` (money + object, required): 
- `tax` (money + object): 
- `quantity` (string, required): The item quantity. Must be a whole number.
- `description` (string): This field supports up to 4000 characters, but any content beyond 2048 characters (including spaces) will be truncated. The 2048 character limit is reflected in the response representation of this field.
- `sku` (string): The stock keeping unit (SKU) for the item.
- `url` (string): The URL to the item being purchased. Visible to buyer and used in buyer experiences.
- `category` (string): The item category type. Values: DIGITAL_GOODS, PHYSICAL_GOODS, DONATION.
- `image_url` (string): The URL of the item's image. File type and size restrictions apply. An image that violates these restrictions will not be honored.
- `upc` (universal_product_code + object): 
- `billing_plan` (order_billing_plan): 

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### shipping_type

A classification for the method of purchase fulfillment.

Allowed values: `SHIPPING`, `PICKUP`, `PICKUP_IN_STORE`, `PICKUP_FROM_PERSON`

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### shipping_option

The options that the payee or merchant offers to the payer to ship or pick up their items.

- `id` (string, required): A unique ID that identifies a payer-selected shipping option.
- `label` (string, required): A description that the payer sees, which helps them choose an appropriate shipping option. For example, `Free Shipping`, `USPS Priority Shipping`, `Expédition prioritaire USPS`, or `USPS yōuxiān fā huò`. Localize this description to the payer's locale.
- `type` (shipping_type + object): 
- `amount` (money + object): 
- `selected` (boolean, required): If the API request sets `selected = true`, it represents the shipping option that the payee or merchant expects to be pre-selected for the payer when they first view the `shipping.options` in the PayPal Checkout experience. As part of the response if a `shipping.option` contains `selected=true`, it represents the shipping option that the payer selected during the course of checkout with PayPal. …

### shipping_detail

The shipping details.

- `name` (name + object): 
- `email_address` (email_address + object): 
- `phone_number` (phone + object): 
- `type` (string): A classification for the method of purchase fulfillment (e.g shipping, in-store pickup, etc). Either `type` or `options` may be present, but not both. Values: SHIPPING, PICKUP_IN_PERSON, PICKUP_IN_STORE, PICKUP_FROM_PERSON.
- `options` (array of shipping_option + object): An array of shipping options that the payee or merchant offers to the payer to ship or pick up their items.
- `address` (address_portable + object): 

### level_2_card_processing_data

The level 2 card processing data collections. If your merchant account has been configured for Level 2 processing this field will be passed to the processor on your behalf. Please contact your PayPal Technical Account Manager to define level 2 data for your business.

- `invoice_id` (string): Use this field to pass a purchase identification value of up to 127 ASCII characters. The length of this field will be adjusted to meet network specifications (25chars for Visa and Mastercard, 17chars for Amex), and the original invoice ID will still be displayed in your existing reports.
- `tax_total` (money + object): 

### item_without_category_tax_or_amount

The details for the items to be purchased.

- `name` (string, required): The item name or title.
- `quantity` (string, required): The item quantity. Must be a whole number.
- `description` (string): The detailed item description.
- `sku` (string): The stock keeping unit (SKU) for the item.
- `url` (string): The URL to the item being purchased. Visible to buyer and used in buyer experiences.
- `image_url` (string): The URL of the item's image. File type and size restrictions apply. An image that violates these restrictions will not be honored.
- `upc` (universal_product_code + object): 
- `billing_plan` (order_billing_plan): 

### line_item

The line items for this purchase. If your merchant account has been configured for Level 3 processing this field will be passed to the processor on your behalf.

### level_3_card_processing_data

The level 3 card processing data collections, If your merchant account has been configured for Level 3 processing this field will be passed to the processor on your behalf. Please contact your PayPal Technical Account Manager to define level 3 data for your business.

- `shipping_amount` (money + object): 
- `duty_amount` (money + object): 
- `discount_amount` (money + object): 
- `shipping_address` (address_portable + object): 
- `ships_from_postal_code` (string): Use this field to specify the postal code of the shipping location.
- `line_items` (array of line_item + object): A list of the items that were purchased with this payment. If your merchant account has been configured for Level 3 processing this field will be passed to the processor on your behalf.

### card_supplementary_data

Merchants and partners can add Level 2 and 3 data to payments to reduce risk and payment processing costs. For more information about processing payments, see checkout or multiparty checkout.

- `level_2` (level_2_card_processing_data): 
- `level_3` (level_3_card_processing_data): 

### ip_address

An Internet Protocol address (IP address). This address assigns a numerical label to each device that is connected to a computer network through the Internet Protocol. Supports IPv4 and IPv6 addresses.

### participant_metadata

Profile information of the sender or receiver.

- `ip_address` (ip_address + object): 

### risk_supplementary_data

Additional information necessary to evaluate the risk profile of a transaction.

- `customer` (participant_metadata): 

### supplementary_data

Supplementary data about a payment. This object passes information that can be used to improve risk assessments and processing costs, for example, by providing Level 2 and Level 3 payment data.

- `card` (card_supplementary_data + object): 
- `risk` (risk_supplementary_data + object): 

### purchase_unit_request

The purchase unit request. Includes required information for the payment contract.

- `reference_id` (string): The API caller-provided external ID for the purchase unit. Required for multiple purchase units when you must update the order through `PATCH`. If you omit this value and the order contains only one purchase unit, PayPal sets this value to `default`.
- `amount` (amount_with_breakdown + object, required): 
- `payee` (payee + object): 
- `payment_instruction` (payment_instruction): 
- `description` (string): This field supports up to 3,000 characters, but any content beyond 127 characters (including spaces) will be truncated. The 127 character limit is reflected in the response representation of this field.The purchase description. The maximum length of the character is dependent on the type of characters used. The character length is specified assuming a US ASCII character. Depending on type of …
- `custom_id` (string): The API caller-provided external ID. Used to reconcile client transactions with PayPal transactions. Appears in transaction and settlement reports but is not visible to the payer.
- `invoice_id` (string): The API caller-provided external invoice number for this order. Appears in both the payer's transaction history and the emails that the payer receives. invoice_id values are required to be unique within each merchant account by default. Although the uniqueness validation is configurable, disabling this behavior will remove the account's ability to use invoice_id in other APIs as an identifier. It …
- `soft_descriptor` (string): This field supports up to 127 characters, but any content beyond 22 characters (including spaces) will be truncated. The 22 character limit is reflected in the response representation of this field.The soft descriptor is the dynamic text used to construct the statement descriptor that appears on a payer's card statement.

If an Order is paid using the "PayPal Wallet", the statement descriptor …
- `items` (array of item_request + object): An array of items that the customer purchases from the merchant.
- `shipping` (shipping_detail + object): 
- `supplementary_data` (supplementary_data + object): 

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/api/rest/reference/country-codes/) or [M49 region code](https://unstats.un.org/unsd/methodology/m49/).

### url

Describes the URL.

### experience_context_base

Customizes the payer experience during the approval process for the payment.

- `brand_name` (string): The label that overrides the business name in the PayPal account on the PayPal site. The pattern is defined by an external party and supports Unicode.
- `locale` (language + object): 
- `shipping_preference` (string): The location from which the shipping address is derived. Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `return_url` (url + object): 
- `cancel_url` (url + object): 

### instrument_id

The identifier of the instrument.

### date_year_month

The year and month, in ISO-8601 `YYYY-MM` date format. See [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### card_brand

The card network or brand. Applies to credit, debit, gift, and payment cards.

Allowed values: `VISA`, `MASTERCARD`, `DISCOVER`, `AMEX`, `SOLO`, `JCB`, `STAR`, `DELTA`, `SWITCH`, `MAESTRO`, `CB_NATIONALE`, `CONFIGOGA`, `CONFIDIS`, `ELECTRON`, `CETELEM`, `CHINA_UNION_PAY`, `DINERS`, `ELO`, `HIPER`, `HIPERCARD`, `RUPAY`, `GE`, `SYNCHRONY`, `EFTPOS`, `CARTE_BANCAIRE`, `STAR_ACCESS`, `PULSE`, `NYCE`, `ACCEL`, `UNKNOWN`

### card_type

Type of card. i.e Credit, Debit and so on.

Allowed values: `CREDIT`, `DEBIT`, `PREPAID`, `STORE`, `UNKNOWN`

### eci_flag

Electronic Commerce Indicator (ECI). The ECI value is part of the 2 data elements that indicate the transaction was processed electronically. This should be passed on the authorization transaction to the Gateway/Processor.

Allowed values: `MASTERCARD_NON_3D_SECURE_TRANSACTION`, `MASTERCARD_ATTEMPTED_AUTHENTICATION_TRANSACTION`, `MASTERCARD_FULLY_AUTHENTICATED_TRANSACTION`, `FULLY_AUTHENTICATED_TRANSACTION`, `ATTEMPTED_AUTHENTICATION_TRANSACTION`, `NON_3D_SECURE_TRANSACTION`

### enrolled

Status of Authentication eligibility.

Allowed values: `Y`, `N`, `U`, `B`

### pares_status

Transactions status result identifier. The outcome of the issuer's authentication.

Allowed values: `Y`, `N`, `U`, `A`, `C`, `R`, `D`, `I`

### merchant_partner_customer_id

The unique ID for a customer generated by PayPal.

### customer

This object represents a merchant’s customer, allowing them to store contact details, and track all payments associated with the same customer.

- `id` (merchant_partner_customer_id): 
- `email_address` (email + object): 
- `phone` (phone_with_type + object): 
- `name` (name + object): 

### card_customer

The details about a customer in PayPal's system of record.

### store_in_vault_instruction

Defines how and when the payment source gets vaulted.

Allowed values: `ON_SUCCESS`

### vault_instruction_base

Basic vault instruction specification that can be extended by specific payment sources that supports vaulting.

- `store_in_vault` (store_in_vault_instruction): 

### card_verification

The API caller can opt in to verify the card through PayPal offered verification services (e.g. Smart Dollar Auth, 3DS).

- `method` (string): The method used for card verification. Values: SCA_ALWAYS, SCA_WHEN_REQUIRED, 3D_SECURE, AVS_CVV.

### card_attributes

Additional attributes associated with the use of this card.

- `customer` (card_customer): 
- `vault` (vault_instruction_base + object): 
- `verification` (card_verification + object): 

### card

The payment card to use to fund a payment. Can be a credit or debit card.

- `id` (instrument_id + object): 
- `name` (string): The card holder's name as it appears on the card.
- `number` (string): The primary account number (PAN) for the payment card.
- `expiry` (date_year_month + object): 
- `security_code` (string): The three- or four-digit security code of the card. Also known as the CVV, CVC, CVN, CVE, or CID. This parameter cannot be present in the request when `payment_initiator=MERCHANT`.
- `last_digits` (string): The last digits of the payment card.
- `card_type` (card_brand + object): 
- `type` (card_type + object): 
- `brand` (card_brand + object): 
- `billing_address` (address_portable + object): 
- `attributes` (card_attributes + object): 

### vault_id

The PayPal-generated ID for the vaulted payment source. This ID should be stored on the merchant's server so the saved payment source can be used for future transactions.

### single_use_token

The PayPal-generated, short-lived, one-time-use token, used to communicate payment information to PayPal for transaction processing.

### payment_initiator

The person or party who initiated or triggered the payment.

Allowed values: `CUSTOMER`, `MERCHANT`

### stored_payment_source_payment_type

Indicates the type of the stored payment_source payment.

Allowed values: `ONE_TIME`, `RECURRING`, `UNSCHEDULED`

### stored_payment_source_usage_type

Indicates if this is a `first` or `subsequent` payment using a stored payment source (also referred to as stored credential or card on file).

Allowed values: `FIRST`, `SUBSEQUENT`, `DERIVED`

### network_transaction

Reference values used by the card network to identify a transaction.

- `id` (string): Transaction reference id returned by the scheme. For Visa and Amex, this is the "Tran id" field in response. For MasterCard, this is the "BankNet reference id" field in response. For Discover, this is the "NRID" field in response. The pattern we expect for this field from Visa/Amex/CB/Discover is numeric, Mastercard/BNPP is alphanumeric and Paysecure is alphanumeric with special character -.
- `date` (string): The date that the transaction was authorized by the scheme. This field may not be returned for all networks. MasterCard refers to this field as "BankNet reference date". For some specific networks, such as MasterCard and Discover, this date field is mandatory when the `previous_network_transaction_reference_id` is passed.
- `network` (card_brand + object): 
- `acquirer_reference_number` (string): Reference ID issued for the card transaction. This ID can be used to track the transaction across processors, card brands and issuing banks.

### network_transaction_reference

Reference values used by the card network to identify a transaction.

### card_stored_credential

Provides additional details to process a payment using a `card` that has been stored or is intended to be stored (also referred to as stored_credential or card-on-file).
Parameter compatibility:

- `payment_type=ONE_TIME` is compatible only with `payment_initiator=CUSTOMER`.
- `usage=FIRST` is compatible only with `payment_initiator=CUSTOMER`.
- `previous_transaction_reference` or `previous_network_transaction_reference` is compatible only with `payment_initiator=MERCHANT`.
- Only one of the parameters - `previous_transaction_reference` and `previous_network_transaction_reference` - can be present in the request.

- `payment_initiator` (payment_initiator, required): 
- `payment_type` (stored_payment_source_payment_type, required): 
- `usage` (stored_payment_source_usage_type): 
- `previous_network_transaction_reference` (network_transaction_reference): 

### network_token_request

The Third Party Network token used to fund a payment.

- `number` (string, required): Third party network token number.
- `expiry` (date_year_month + object, required): 
- `cryptogram` (string): An Encrypted one-time use value that's sent along with Network Token. This field is not required to be present for recurring transactions.
- `eci_flag` (eci_flag): 
- `token_requestor_id` (string): A TRID, or a Token Requestor ID, is an identifier used by merchants to request network tokens from card networks. A TRID is a precursor to obtaining a network token for a credit card primary account number (PAN), and will aid in enabling secure card on file (COF) payments and reducing fraud.

### card_experience_context

Customizes the payer experience during the 3DS Approval for payment.

- `return_url` (url + string): 
- `cancel_url` (url + string): 

### card_request

The payment card to use to fund a payment. Can be a credit or debit card.Note: Passing card number, cvv and expiry directly via the API requires PCI SAQ D compliance. 
*PayPal offers a mechanism by which you do not have to take on the PCI SAQ D burden by using hosted fields - refer to this Integration Guide*.

### token

The tokenized payment source to fund a payment.

- `id` (string, required): The PayPal-generated ID for the token.
- `type` (string, required): The tokenization method that generated the ID. Values: BILLING_AGREEMENT.

### v3_vault_instruction_base

Base vaulting specification. The object can be extended for specific use cases within each payment_source that supports vaulting.

- `store_in_vault` (store_in_vault_instruction, required): 

### payee_payment_method_preference

The merchant-preferred payment methods.

Allowed values: `UNRESTRICTED`, `IMMEDIATE_PAYMENT_REQUIRED`

### paypal_wallet_customer

The details about a customer in PayPal's system of record.

### account_id-2

The PayPal payer ID, which is a masked version of the PayPal account number intended for use with third parties. The account number is reversibly encrypted and a proprietary variant of Base32 is used to encode the result.

### vault_paypal_wallet_base

Resource consolidating common request and response attributes for vaulting PayPal Wallet.

### charge_pattern

Expected business/pricing model for the billing agreement.

Allowed values: `IMMEDIATE`, `DEFERRED`, `RECURRING_PREPAID`, `RECURRING_POSTPAID`, `THRESHOLD_PREPAID`, `THRESHOLD_POSTPAID`, `SUBSCRIPTION_PREPAID`, `SUBSCRIPTION_POSTPAID`, `UNSCHEDULED_PREPAID`, `UNSCHEDULED_POSTPAID`, `INSTALLMENT_PREPAID`, `INSTALLMENT_POSTPAID`

### paypal_wallet_attributes

Additional attributes associated with the use of this PayPal Wallet.

- `customer` (paypal_wallet_customer): 
- `vault` (vault_paypal_wallet_base + object): 

### native_app_context

Merchant provided, buyer's native app preferences to app switch to the PayPal consumer app.

- `os_type` (string): Operating System type of the device that the buyer is using. Values: ANDROID, IOS, OTHER.
- `os_version` (string): Operating System version of the device that the buyer is using.

### mobile_web_context

Buyer's mobile web browser context to app switch to the PayPal consumer app.

- `return_flow` (string): Merchant preference on how the buyer can navigate back to merchant website post approving the transaction on the PayPal App. Values: AUTO, MANUAL.
- `buyer_user_agent` (string): User agent from the request originating from the buyer's device. This will be used to identify the buyer's operating system and browser versions. NOTE: Merchants must not alter or modify the buyer's device user agent.

### app_switch_context

Merchant provided details of the native app or mobile web browser to facilitate buyer's app switch to the PayPal consumer app.

- `native_app` (native_app_context): 
- `mobile_web` (mobile_web_context): 

### billing_agreement_id

The PayPal billing agreement ID. References an approved recurring payment for goods or services.

### callback_configuration

CallBack Configuration that the merchant can provide to PayPal/Venmo.

- `callback_events` (array of string, required): An array of callback events merchant can subscribe to for the corresponding callback url.
- `callback_url` (string, required): Merchant provided CallBack url.PayPal/Venmo will use this url to call the merchant back when the events occur .PayPal/Venmo expects a secured url usually in the https format.merchant can append the cart id or other params part of the url as query or path params.

### paypal_wallet_experience_context

Customizes the payer experience during the approval process for payment with PayPal.Note: Partners and Marketplaces might configure `brand_name` and `shipping_preference` during partner account setup, which overrides the request values.

- `brand_name` (string): The label that overrides the business name in the PayPal account on the PayPal site. The pattern is defined by an external party and supports Unicode.
- `locale` (language + object): 
- `shipping_preference` (string): The location from which the shipping address is derived. Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `contact_preference` (string): The preference to display the contact information (buyer’s shipping email & phone number) on PayPal's checkout for easy merchant-buyer communication. Values: NO_CONTACT_INFO, UPDATE_CONTACT_INFO, RETAIN_CONTACT_INFO.
- `return_url` (url + object): 
- `cancel_url` (url + object): 
- `app_switch_context` (app_switch_context + object): 
- `landing_page` (string): The type of landing page to show on the PayPal site for customer checkout. Values: LOGIN, GUEST_CHECKOUT, NO_PREFERENCE, BILLING.
- `user_action` (string): Configures a Continue or Pay Now checkout flow. Values: CONTINUE, PAY_NOW.
- `payment_method_preference` (string): The merchant-preferred payment methods. Values: UNRESTRICTED, IMMEDIATE_PAYMENT_REQUIRED.
- `order_update_callback_config` (callback_configuration + object): 

### paypal_wallet_stored_credential

Provides additional details to process a payment using the PayPal wallet billing agreement or a vaulted payment method that has been stored or is intended to be stored.

- `payment_initiator` (payment_initiator, required): 
- `charge_pattern` (charge_pattern + object): 
- `usage_pattern` (charge_pattern): 
- `usage` (stored_payment_source_usage_type): 

### paypal_wallet

A resource that identifies a PayPal Wallet is used for payment.

- `vault_id` (vault_id + object): 
- `email_address` (email + object): 
- `name` (name + object): 
- `phone` (phone_with_type + object): 
- `birth_date` (date_no_time + object): 
- `tax_info` (tax_info + object): 
- `address` (address_portable + object): 
- `attributes` (paypal_wallet_attributes + object): 
- `experience_context` (paypal_wallet_experience_context): 
- `billing_agreement_id` (billing_agreement_id): 
- `stored_credential` (paypal_wallet_stored_credential): 

### full_name

The full name representation like Mr J Smith.

### bancontact_request

Information needed to pay using Bancontact.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### blik_experience_context

Customizes the payer experience during the approval process for the BLIK payment.

### blik_seamless

Information used to pay using BLIK level_0 flow.

- `auth_code` (string, required): The 6-digit code used to authenticate a consumer within BLIK.

### blik_one_click

Information used to pay using BLIK one-click flow.

- `auth_code` (string): The 6-digit code used to authenticate a consumer within BLIK.
- `consumer_reference` (string, required): The merchant generated, unique reference serving as a primary identifier for accounts connected between Blik and a merchant.
- `alias_label` (string): A bank defined identifier used as a display name to allow the payer to differentiate between multiple registered bank accounts.
- `alias_key` (string): A Blik-defined identifier for a specific Blik-enabled bank account that is associated with a given merchant. Used only in conjunction with a Consumer Reference.

### blik_request

Information needed to pay using BLIK.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `email` (email_address + object): 
- `experience_context` (blik_experience_context + object): 
- `level_0` (blik_seamless + object): 
- `one_click` (blik_one_click + object): 

### eps_request

Information needed to pay using eps.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### giropay_request

Information needed to pay using giropay.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### bic

The business identification code (BIC). In payments systems, a BIC is used to identify a specific business, most commonly a bank.

### ideal_request

Information needed to pay using iDEAL.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `bic` (bic + object): 
- `experience_context` (experience_context_base + object): 

### mybank_request

Information needed to pay using MyBank.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### p24_request

Information needed to pay using P24 (Przelewy24).

- `name` (full_name + object, required): 
- `email` (email_address + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### sofort_request

Information needed to pay using Sofort.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `experience_context` (experience_context_base + object): 

### trustly_request

Information needed to pay using Trustly.

- `name` (full_name + object, required): 
- `country_code` (country_code-2 + object, required): 
- `email` (email_address + object, required): 
- `experience_context` (experience_context_base + object): 

### apple_pay_payment_data

Information about the decrypted apple pay payment data for the token like cryptogram, eci indicator.

- `cryptogram` (string): Online payment cryptogram, as defined by 3D Secure. The pattern is defined by an external party and supports Unicode.
- `eci_indicator` (string): ECI indicator, as defined by 3- Secure. The pattern is defined by an external party and supports Unicode.
- `emv_data` (string): Encoded Apple Pay EMV Payment Structure used for payments in China. The pattern is defined by an external party and supports Unicode.
- `pin` (string): Bank Key encrypted Apple Pay PIN. The pattern is defined by an external party and supports Unicode.

### apple_pay_decrypted_token_data

Information about the Payment data obtained by decrypting Apple Pay token.

- `transaction_amount` (money + object): 
- `tokenized_card` (card + object, required): 
- `device_manufacturer_id` (string): Apple Pay Hex-encoded device manufacturer identifier. The pattern is defined by an external party and supports Unicode.
- `payment_data_type` (string): Indicates the type of payment data passed, in case of Non China the payment data is 3DSECURE and for China it is EMV. Values: 3DSECURE, EMV.
- `payment_data` (apple_pay_payment_data + object): 

### apple_pay_attributes

Additional attributes associated with apple pay.

- `customer` (customer): 
- `vault` (v3_vault_instruction_base): 

### apple_pay_experience_context

Customizes the payer experience during the approval process for the payment.

- `return_url` (url + object, required): 
- `cancel_url` (url + object, required): 

### apple_pay_request

Information needed to pay using ApplePay.

- `id` (string): ApplePay transaction identifier, this will be the unique identifier for this transaction provided by Apple. The pattern is defined by an external party and supports Unicode.
- `name` (full_name + object): 
- `email_address` (email_address + object): 
- `phone_number` (phone_number_without_country_code + object): 
- `decrypted_token` (apple_pay_decrypted_token_data + object): 
- `stored_credential` (card_stored_credential): 
- `vault_id` (vault_id + object): 
- `attributes` (apple_pay_attributes): 
- `experience_context` (apple_pay_experience_context): 

### phone_with_national_required_and_country_code

A structured representation of a phone number conforming to the international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en),requiring the national_number field and optionally supporting the country_code.

- `country_code` (string): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).

### google_pay_card

The payment card used to fund a Google Pay payment. Can be a credit or debit card.

- `name` (string): The card holder's name as it appears on the card.
- `number` (string): The primary account number (PAN) for the payment card.
- `expiry` (date_year_month + object): 
- `last_digits` (string): The last digits of the payment card.
- `type` (card_type + object): 
- `brand` (card_brand + object): 
- `billing_address` (address_portable + object): 

### google_pay_decrypted_token_data

Details shared by Google for the merchant to be shared with PayPal. This is required to process the transaction using the Google Pay payment method.

- `message_id` (string): A unique ID that identifies the message in case it needs to be revoked or located at a later time.
- `message_expiration` (string): Date and time at which the message expires as UTC milliseconds since epoch. Integrators should reject any message that's expired.
- `payment_method` (string, required): The type of the payment credential. Currently, only CARD is supported. Values: CARD.
- `card` (google_pay_card + object, required): Google Pay tokenized credit card used to pay.
- `authentication_method` (string, required): Authentication Method which is used for the card transaction. Values: PAN_ONLY, CRYPTOGRAM_3DS.
- `cryptogram` (string): Base-64 cryptographic identifier used by card schemes to validate the token verification result. This is a conditionally required field if authentication_method is CRYPTOGRAM_3DS.
- `eci_indicator` (string): Electronic Commerce Indicator may not always be present. It is only returned for tokens on the Visa card network. This value is passed through in the payment authorization request.

### assurance_details

Information about cardholder possession validation and cardholder identification and verifications (ID&V).

- `account_verified` (boolean): If true, indicates that Cardholder possession validation has been performed on returned payment credential.
- `card_holder_authenticated` (boolean): If true, indicates that identification and verifications (ID&V) was performed on the returned payment credential.If false, the same risk-based authentication can be performed as you would for card transactions. This risk-based authentication can include, but not limited to, step-up with 3D Secure protocol if applicable.

### google_pay_experience_context

Customizes the payer experience during the approval process for the payment.

- `return_url` (url + object, required): 
- `cancel_url` (url + object, required): 

### google_pay_request

Information needed to pay using Google Pay.

- `name` (full_name + object): 
- `email_address` (email_address + object): 
- `phone_number` (phone_with_national_required_and_country_code + object): 
- `card` (google_pay_card + object): 
- `decrypted_token` (google_pay_decrypted_token_data + object): 
- `assurance_details` (assurance_details + object): 
- `experience_context` (google_pay_experience_context): 

### venmo_wallet_experience_context

Customizes the buyer experience during the approval process for payment with Venmo.Note: Partners and Marketplaces might configure `shipping_preference` during partner account setup, which overrides the request values.

- `brand_name` (string): The business name of the merchant. The pattern is defined by an external party and supports Unicode.
- `shipping_preference` (string): The location from which the shipping address is derived. Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `order_update_callback_config` (callback_configuration + object): 
- `user_action` (string): Configures a Continue or Pay Now checkout flow. Values: CONTINUE, PAY_NOW.

### venmo_wallet_customer

This object represents a merchant’s customer, allowing them to store contact details, and track all payments associated with the same customer.

### vault_venmo_wallet_base

Resource consolidating common request and response attirbutes for vaulting Venmo Wallet.

### venmo_wallet_attributes

Additional attributes associated with the use of this Venmo Wallet.

- `customer` (venmo_wallet_customer): 
- `vault` (vault_venmo_wallet_base + object): 

### venmo_wallet_request

Information needed to pay using Venmo.

- `vault_id` (vault_id + object): 
- `email_address` (email + object): 
- `experience_context` (venmo_wallet_experience_context): 
- `attributes` (venmo_wallet_attributes + object): 

### crypto_account_holder_name

Crypto account holder name.

- `prefix` (string): The prefix, or title, to the account holder's name.
- `given_name` (string, required): When the account holder is a person, the account holder's given, or first, name.
- `surname` (string, required): When the account holder is a person, the account holder's surname or family name. Also known as the last name. Required when the account holder is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.
- `middle_name` (string): When the account holder is a person, the account holder's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.

### experience_context_base_without_brand_shipping

Customizes the payer experience during the approval process for the payment.

- `locale` (language + object): 
- `return_url` (url + object, required): 
- `cancel_url` (url + object, required): 

### crypto_request

Crypto payment used to fund the transaction.

- `country_code` (country_code + object, required): 
- `name` (crypto_account_holder_name + object, required): 
- `experience_context` (experience_context_base_without_brand_shipping + object, required): 

### payment_source

The payment source definition.

- `card` (card_request): 
- `token` (token): 
- `paypal` (paypal_wallet + object): 
- `bancontact` (bancontact_request + object): 
- `blik` (blik_request + object): 
- `eps` (eps_request + object): 
- `giropay` (giropay_request + object): 
- `ideal` (ideal_request + object): 
- `mybank` (mybank_request + object): 
- `p24` (p24_request + object): 
- `sofort` (sofort_request + object): 
- `trustly` (trustly_request + object): 
- `apple_pay` (apple_pay_request + object): 
- `google_pay` (google_pay_request + object): 
- `venmo` (venmo_wallet_request + object): 
- `crypto` (crypto_request + object): 

### payment_method

The customer and merchant payment preferences.

- `payee_preferred` (payee_payment_method_preference): 
- `standard_entry_class_code` (string): NACHA (the regulatory body governing the ACH network) requires that API callers (merchants, partners) obtain the consumer’s explicit authorization before initiating a transaction. To stay compliant, you’ll need to make sure that you retain a compliant authorization for each transaction that you originate to the ACH Network using this API. ACH transactions are categorized (using SEC codes) by how … Values: TEL, WEB, CCD, PPD.

### stored_payment_source

Provides additional details to process a payment using a `payment_source` that has been stored or is intended to be stored (also referred to as stored_credential or card-on-file).
Parameter compatibility:

- `payment_type=ONE_TIME` is compatible only with `payment_initiator=CUSTOMER`.
- `usage=FIRST` is compatible only with `payment_initiator=CUSTOMER`.
- `previous_transaction_reference` or `previous_network_transaction_reference` is compatible only with `payment_initiator=MERCHANT`.
- Only one of the parameters - `previous_transaction_reference` and `previous_network_transaction_reference` - can be present in the request.

- `payment_initiator` (payment_initiator, required): 
- `payment_type` (stored_payment_source_payment_type, required): 
- `usage` (stored_payment_source_usage_type): 
- `previous_network_transaction_reference` (network_transaction_reference): 

### order_application_context

Customizes the payer experience during the approval process for the payment with PayPal.Note: Partners and Marketplaces might configure `brand_name` and `shipping_preference` during partner account setup, which overrides the request values.

- `brand_name` (string): DEPRECATED. The label that overrides the business name in the PayPal account on the PayPal site. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.brand_name`). Please specify this field in the `experience_context` object instead of the `application_context` object.
- `locale` (language + object): 
- `landing_page` (string): DEPRECATED. DEPRECATED. The type of landing page to show on the PayPal site for customer checkout. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.landing_page`). Please specify this field in the `experience_context` object instead of the `application_context` … Values: LOGIN, BILLING, NO_PREFERENCE.
- `shipping_preference` (string): DEPRECATED. DEPRECATED. The shipping preference:

- Displays the shipping address to the customer.
- Enables the customer to choose an address on the PayPal site.
- Restricts the customer from changing the address during the payment-approval process.
. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. … Values: GET_FROM_FILE, NO_SHIPPING, SET_PROVIDED_ADDRESS.
- `user_action` (string): DEPRECATED. Configures a Continue or Pay Now checkout flow. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.user_action`). Please specify this field in the `experience_context` object instead of the `application_context` object. Values: CONTINUE, PAY_NOW.
- `payment_method` (payment_method + object): 
- `return_url` (string): DEPRECATED. The URL where the customer is redirected after the customer approves the payment. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.return_url`). Please specify this field in the `experience_context` object instead of the `application_context` object.
- `cancel_url` (string): DEPRECATED. The URL where the customer is redirected after the customer cancels the payment. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.cancel_url`). Please specify this field in the `experience_context` object instead of the `application_context` object.
- `stored_payment_source` (stored_payment_source + object): 

### order_request

The order request details.

- `intent` (checkout_payment_intent, required): 
- `payer` (payer + object): 
- `purchase_units` (array of purchase_unit_request + object, required): An array of purchase units. Each purchase unit establishes a contract between a payer and the payee. Each purchase unit represents either a full or partial order that the payer intends to purchase from the payee.
- `payment_source` (payment_source): 
- `application_context` (order_application_context + object): 

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

### activity_timestamps

The date and time stamps that are common to authorized payment, captured payment, and refund transactions.

- `create_time` (date_time + object): 
- `update_time` (date_time + object): 

### liability_shift

Liability shift indicator. The outcome of the issuer's authentication.

Allowed values: `NO`, `POSSIBLE`, `UNKNOWN`

### three_d_secure_authentication_response

Results of 3D Secure Authentication.

- `authentication_status` (pares_status + object): 
- `enrollment_status` (enrolled + object): 

### authentication_response

Results of Authentication such as 3D Secure.

- `liability_shift` (liability_shift): 
- `three_d_secure` (three_d_secure_authentication_response): 

### vault_response

The details about a saved payment source.

- `id` (string): The PayPal-generated ID for the saved payment source.
- `status` (string): The vault status. Values: VAULTED, CREATED, APPROVED.
- `customer` (customer + object): 
- `links` (array of link_description + object): An array of request-related HATEOAS links.

### card_vault_response

The details about a saved Card payment source.

### card_attributes_response

Additional attributes associated with the use of this card.

- `vault` (card_vault_response): 

### card_from_request

Representation of card details as received in the request.

- `expiry` (date_year_month + object): 
- `last_digits` (string): The last digits of the payment card.

### bin_details

Bank Identification Number (BIN) details used to fund a payment.

- `bin` (string): The Bank Identification Number (BIN) signifies the number that is being used to identify the granular level details (except the PII information) of the card.
- `issuing_bank` (string): The issuer of the card instrument.
- `bin_country_code` (country_code-2 + object): 
- `products` (array of string): The type of card product assigned to the BIN by the issuer. These values are defined by the issuer and may change over time. Some examples include: PREPAID_GIFT, CONSUMER, CORPORATE.

### card_response

The payment card to use to fund a payment. Card can be a credit or debit card.

- `name` (string): The card holder's name as it appears on the card.
- `last_digits` (string): The last digits of the payment card.
- `brand` (card_brand + object): 
- `available_networks` (array of card_brand + object): Array of brands or networks associated with the card.
- `type` (card_type + object): 
- `authentication_result` (authentication_response): 
- `attributes` (card_attributes_response): 
- `from_request` (card_from_request): 
- `expiry` (date_year_month + object): 
- `bin_details` (bin_details + object): 
- `stored_credential` (card_stored_credential): 

### phone-3

The phone number in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).

### paypal_wallet_vault_response

The details about a saved PayPal Wallet payment source.

### cobranded_card

Details about the merchant cobranded card used for order purchase.

- `labels` (array of string): Array of labels for the cobranded card.
- `payee` (payee_base + object): 
- `amount` (money + object): 

### paypal_wallet_attributes_response

Additional attributes associated with the use of a PayPal Wallet.

- `vault` (paypal_wallet_vault_response): 
- `cobranded_cards` (array of cobranded_card + object): An array of merchant cobranded cards used by buyer to complete an order. This array will be present if a merchant has onboarded their cobranded card with PayPal and provided corresponding label(s).

### paypal_wallet_response

The PayPal Wallet response.

- `email_address` (email + object): 
- `account_id` (account_id-2 + object): 
- `account_status` (string): The account status indicates whether the buyer has verified the financial details associated with their PayPal account. Values: VERIFIED, UNVERIFIED.
- `name` (name + object): 
- `phone_type` (phone_type): 
- `phone_number` (phone-3 + object): 
- `birth_date` (date_no_time + object): 
- `business_name` (string): The business name of the PayPal account holder (populated for business accounts only)
- `tax_info` (tax_info + object): 
- `address` (address_portable + object): 
- `attributes` (paypal_wallet_attributes_response): 
- `stored_credential` (paypal_wallet_stored_credential): 
- `experience_status` (string): This field indicates the status of PayPal's Checkout experience throughout the order lifecycle. The values reflect the current stage of the checkout process. Values: NOT_STARTED, IN_PROGRESS, CANCELED, APPROVED.

### apple_pay_card_response

The Card from Apple Pay Wallet used to fund the payment.

### iban_last_chars

The last characters of the IBAN used to pay.

### bancontact

Information used to pay Bancontact.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 
- `iban_last_chars` (iban_last_chars): 
- `card_last_digits` (string): The last digits of the card used to fund the Bancontact payment.

### blik_one_click_response

Information used to pay using BLIK one-click flow.

- `consumer_reference` (string): The merchant generated, unique reference serving as a primary identifier for accounts connected between Blik and a merchant.

### blik

Information used to pay using BLIK.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `email` (email_address + object): 
- `one_click` (blik_one_click_response + object): 

### eps

Information used to pay using eps.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 

### giropay

Information needed to pay using giropay.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 

### ideal

Information used to pay using iDEAL.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 
- `iban_last_chars` (iban_last_chars): 

### mybank

Information used to pay using MyBank.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 
- `iban_last_chars` (iban_last_chars): 

### p24

Information used to pay using P24(Przelewy24).

- `name` (full_name + object): 
- `email` (email_address + object): 
- `country_code` (country_code-2 + object): 
- `payment_descriptor` (string): P24 generated payment description.
- `method_id` (string): Numeric identifier of the payment scheme or bank used for the payment.
- `method_description` (string): Friendly name of the payment scheme or bank used for the payment.

### sofort

Information used to pay using Sofort.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `bic` (bic + object): 
- `iban_last_chars` (iban_last_chars): 

### trustly

Information needed to pay using Trustly.

- `name` (full_name + object): 
- `country_code` (country_code-2 + object): 
- `email` (email_address + object): 
- `bic` (bic + object): 
- `iban_last_chars` (iban_last_chars): 

### apple_pay_attributes_response

Additional attributes associated with the use of Apple Pay.

- `vault` (vault_response): 

### apple_pay

Information needed to pay using ApplePay.

- `id` (string): ApplePay transaction identifier, this will be the unique identifier for this transaction provided by Apple. The pattern is defined by an external party and supports Unicode.
- `token` (string): Encrypted ApplePay token, containing card information. This token would be base64encoded. The pattern is defined by an external party and supports Unicode.
- `name` (full_name + object): 
- `email_address` (email_address + object): 
- `phone_number` (phone + object): 
- `card` (apple_pay_card_response + object): 
- `attributes` (apple_pay_attributes_response + object): 
- `stored_credential` (card_stored_credential): 

### google_pay_card_response

The payment card to use to fund a Google Pay payment response. Can be a credit or debit card.

- `name` (string): The card holder's name as it appears on the card.
- `last_digits` (string): The last digits of the payment card.
- `type` (card_type + object): 
- `brand` (card_brand + object): 
- `billing_address` (address_portable + object): 
- `authentication_result` (authentication_response): 

### google_pay

Google Pay Wallet payment data.

- `name` (full_name + object): 
- `email_address` (email_address + object): 
- `phone_number` (phone_with_national_required_and_country_code + object): 
- `card` (google_pay_card_response + object): 

### venmo_vault_response

The details about a saved venmo payment source.

### venmo_wallet_attributes_response

Additional attributes associated with the use of a Venmo Wallet.

- `vault` (venmo_vault_response): 

### venmo_wallet_response

Venmo wallet response.

- `email_address` (email + object): 
- `account_id` (account_id-2 + object): 
- `user_name` (string): The Venmo user name chosen by the user, also know as a Venmo handle.
- `name` (name + object): 
- `phone_number` (phone-3 + object): 
- `address` (address_portable + object): 
- `return_flow` (string): Merchant preference on how the buyer can navigate back to merchant website post approving the transaction on the Venmo App. Values: AUTO, MANUAL.
- `attributes` (venmo_wallet_attributes_response): 

### crypto

Pay With Crypto details response object.

- `country_code` (country_code + object): 
- `name` (crypto_account_holder_name + object): 
- `experience_context` (experience_context_base + object): 

### payment_source_response

The payment source used to fund the payment.

- `card` (card_response): 
- `paypal` (paypal_wallet_response): 
- `bancontact` (bancontact): 
- `blik` (blik): 
- `eps` (eps): 
- `giropay` (giropay): 
- `ideal` (ideal): 
- `mybank` (mybank): 
- `p24` (p24): 
- `sofort` (sofort): 
- `trustly` (trustly): 
- `apple_pay` (apple_pay): 
- `google_pay` (google_pay): 
- `venmo` (venmo_wallet_response): 
- `crypto` (crypto): 

### item

The details for the items to be purchased.

- `name` (string, required): The item name or title.
- `unit_amount` (money + object, required): 
- `tax` (money + object): 
- `quantity` (string, required): The item quantity. Must be a whole number.
- `description` (string): The detailed item description.
- `sku` (string): The stock keeping unit (SKU) for the item.
- `url` (string): The URL to the item being purchased. Visible to buyer and used in buyer experiences.
- `category` (string): The item category type. Values: DIGITAL_GOODS, PHYSICAL_GOODS, DONATION.
- `image_url` (string): The URL of the item's image. File type and size restrictions apply. An image that violates these restrictions will not be honored.
- `upc` (universal_product_code + object): 
- `billing_plan` (order_billing_plan): 

### tracker_status

The status of the item shipment.

Allowed values: `CANCELLED`, `SHIPPED`

### tracker_item

The details of the items in the shipment.

- `name` (string): The item name or title.
- `quantity` (string): The item quantity. Must be a whole number.
- `sku` (string): The stock keeping unit (SKU) for the item. This can contain unicode characters.
- `url` (string): The URL to the item being purchased. Visible to buyer and used in buyer experiences.
- `image_url` (string): The URL of the item's image. File type and size restrictions apply. An image that violates these restrictions will not be honored.
- `upc` (universal_product_code + object): 

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

### tracker

The tracking response on creation of tracker.

### shipping_with_tracking_details

The order shipping details.

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

### authorization

The authorized payment transaction.

### processor_response

The processor response information for payment requests, such as direct credit card transactions.

- `avs_code` (string): The address verification code for Visa, Discover, Mastercard, or American Express transactions. Values: A, B, C, D, E, F, G, I, M, N, P, R, S, U, W.
- `cvv_code` (string): The card verification value code for for Visa, Discover, Mastercard, or American Express. Values: E, I, M, N, P, S, U, X, All others, 0, 1, 2, 3, 4.
- `response_code` (string): Processor response code for the non-PayPal payment processor errors. Values: 0000, 00N7, 0100, 0390, 0500, 0580, 0800, 0880, 0890, 0960, 0R00, 1000, 10BR, 1300, 1310.
- `payment_advice_code` (string): The declined payment transactions might have payment advice codes. The card networks, like Visa and Mastercard, return payment advice codes. Values: 01, 02, 03, 04, 21, 22, 24, 25, 26, 27, 28, 29, 30, 40, 43.

### authorization_with_additional_data

The authorization with additional payment details, such as risk assessment and processor response. These details are populated only for certain payment methods.

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

### capture

A captured payment.

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

### payment_collection

The collection of payments, or transactions, for a purchase unit in an order. For example, authorized payments, captured payments, and refunds.

- `authorizations` (array of authorization_with_additional_data + object): An array of authorized payments for a purchase unit. A purchase unit can have zero or more authorized payments.
- `captures` (array of capture + object): An array of captured payments for a purchase unit. A purchase unit can have zero or more captured payments.
- `refunds` (array of refund + object): An array of refunds for a purchase unit. A purchase unit can have zero or more refunds.

### purchase_unit

The purchase unit details. Used to capture required information for the payment contract.

- `reference_id` (string): The API caller-provided external ID for the purchase unit. Required for multiple purchase units when you must update the order through `PATCH`. If you omit this value and the order contains only one purchase unit, PayPal sets this value to `default`. Note: If there are multiple purchase units, `reference_id` is required for each purchase unit.
- `amount` (amount_with_breakdown): 
- `payee` (payee + object): 
- `payment_instruction` (payment_instruction): 
- `description` (string): The purchase description.
- `custom_id` (string): The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports.
- `invoice_id` (string): The API caller-provided external invoice ID for this order.
- `id` (string): The PayPal-generated ID for the purchase unit. This ID appears in both the payer's transaction history and the emails that the payer receives. In addition, this ID is available in transaction and settlement reports that merchants and API callers can use to reconcile transactions. This ID is only available when an order is saved by calling `v2/checkout/orders/id/save`.
- `soft_descriptor` (string): The payment descriptor on account transactions on the customer's credit card statement, that PayPal sends to processors. The maximum length of the soft descriptor information that you can pass in the API field is 22 characters, in the following format:`22 - len(PAYPAL * (8)) - len(Descriptor in Payment Receiving Preferences of Merchant account + 1)`The PAYPAL prefix uses 8 characters.

The soft …
- `items` (array of item + object): An array of items that the customer purchases from the merchant.
- `shipping` (shipping_with_tracking_details + object): 
- `supplementary_data` (supplementary_data + object): 
- `payments` (payment_collection + object): 

### order_status

The order status.

Allowed values: `CREATED`, `SAVED`, `APPROVED`, `VOIDED`, `COMPLETED`, `PAYER_ACTION_REQUIRED`

### order

The order details.

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (object): The value to apply. The `remove`, `copy`, and `move` operations do not require a value. Since JSON Patch allows any type for `value`, the `type` property is not specified.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### order_confirm_application_context

Customizes the payer confirmation experience.

- `brand_name` (string): Label to present to your payer as part of the PayPal hosted web experience.
- `locale` (language + object): 
- `return_url` (string): The URL where the customer is redirected after the customer approves the payment.
- `cancel_url` (string): The URL where the customer is redirected after the customer cancels the payment.
- `stored_payment_source` (stored_payment_source): 

### confirm_order_request

Payer confirms the intent to pay for the Order using the provided payment source.

- `payment_source` (payment_source, required): 
- `application_context` (order_confirm_application_context): 

### order_authorize_request

The authorization of an order request.

- `payment_source` (payment_source + object): 

### order_authorize_response

The order authorize response.

### order_capture_request

Completes an capture payment for an order.

- `payment_source` (payment_source + object): 

### shipment_carrier

The carrier for the shipment. Some carriers have a global version as well as local subsidiaries. The subsidiaries are repeated over many countries and might also have an entry in the global list. Choose the carrier for your country. If the carrier is not available for your country, choose the global version of the carrier. If your carrier name is not in the list, set `carrier` to `OTHER` and set carrier name in `carrier_name_other`. For allowed values, see Carriers.

Allowed values: `DPD_RU`, `BG_BULGARIAN_POST`, `KR_KOREA_POST`, `ZA_COURIERIT`, `FR_EXAPAQ`, `ARE_EMIRATES_POST`, `GAC`, `GEIS`, `SF_EX`, `PAGO`, `MYHERMES`, `DIAMOND_EUROGISTICS`, `CORPORATECOURIERS_WEBHOOK`, `BOND`, `OMNIPARCEL`, `SK_POSTA`, `PUROLATOR`, `FETCHR_WEBHOOK`, `THEDELIVERYGROUP`, `CELLO_SQUARE`, `TARRIVE`, `COLLIVERY`, `MAINFREIGHT`, `IND_FIRSTFLIGHT`, `ACSWORLDWIDE`, `AMSTAN`, `OKAYPARCEL`, `ENVIALIA_REFERENCE`, `SEUR_ES`, `CONTINENTAL`, `FDSEXPRESS`, `AMAZON_FBA_SWISHIP`, `WYNGS`, `DHL_ACTIVE_TRACING`, `ZYLLEM`, `RUSTON`, `XPOST`, `CORREOS_ES`, `DHL_FR`, `PAN_ASIA`

### shipment_tracker

The tracking information for a shipment.

- `tracking_number` (string, required): The tracking number for the shipment. This property supports Unicode.
- `carrier` (shipment_carrier, required): 
- `carrier_name_other` (string): The name of the carrier for the shipment. Provide this value only if the carrier parameter is OTHER. This property supports Unicode.

### order_tracker_request

The tracking details of an order.

### order_update_callback_request

Shipping Options Callback request. This will be implemented by the merchants.

- `id` (string): The ID of the order.
- `shipping_address` (address_portable + object): 
- `shipping_option` (shipping_option + object): 
- `purchase_units` (array of purchase_unit_request + object, required): An array of purchase units. At present only 1 purchase_unit is supported. Each purchase unit establishes a contract between a payer and the payee. Each purchase unit represents either a full or partial order that the payer intends to purchase from the payee.

### order_update_callback_response

Returns the updated shipping options for an order.

- `id` (string): The ID of the order.

### order_update_callback_error_response_details

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `issue` (string, required): The unique, fine-grained application-level error code.

### order_update_callback_error_response

The error details.

- `name` (string, required): The human-readable, unique name of the error.
- `message` (string): The message that describes the error.
- `details` (array of order_update_callback_error_response_details): An array of additional details about the error.

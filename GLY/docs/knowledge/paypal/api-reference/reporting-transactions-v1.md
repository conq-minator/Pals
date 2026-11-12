---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/reporting_transactions_v1.json
title: "PayPal Transaction Search API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Transaction Search (version 1.9)

Use the Transaction Search API to get the history of transactions for a PayPal account. To use the API on behalf of third parties, you must be part of the PayPal partner network. Reach out to your partner manager for the next steps. To enroll in the partner program, see Partner with PayPal. For more information about the API, see the Transaction Search API Integration Guide.Note: To use the API on behalf of third parties, you must be part of the PayPal partner network. Reach out to your partner manager for the next steps. To enroll in the partner program, see Partner with PayPal.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List transactions

`GET /v1/reporting/transactions`

Lists transactions. Specify one or more query parameters to filter the transaction that appear in the response.Notes: 

- If you specify one or more optional query parameters, the `ending_balance` response field is empty.
- It takes a maximum of three hours for executed transactions to appear in the list transactions call.
- This call lists transaction for the previous three years.

Parameters:

- `transaction_id` (query): Filters the transactions in the response by a PayPal transaction ID. A valid transaction ID is 17 characters long, except for an order ID, which is 19 characters long.Note: A transaction ID is not unique in the reporting system. The response can list two transactions with the same ID. One …
- `transaction_type` (query): Filters the transactions in the response by a PayPal transaction event code. See [Transaction event codes](/docs/integration/direct/transaction-search/transaction-event-codes/).
- `transaction_status` (query): Filters the transactions in the response by a PayPal transaction status code. Value is:Status&nbsp;codeDescription`D`PayPal or merchant rules denied the transaction.`P`The transaction is pending. The transaction was created but waits for another payment process to complete, such as an ACH …
- `transaction_amount` (query): Filters the transactions in the response by a gross transaction amount range. Specify the range as ` TO `, where `` is the lower limit of the gross PayPal transaction amount and `` is the upper limit of the gross transaction amount. Specify the amounts in lower denominations. For example, to search …
- `transaction_currency` (query): Filters the transactions in the response by a [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) for the PayPal transaction currency.
- `start_date` (query, required): Filters the transactions in the response by a start date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required. Fractional seconds are optional.
- `end_date` (query, required): Filters the transactions in the response by an end date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required. Fractional seconds are optional. The maximum supported range is 31 days.
- `payment_instrument_type` (query): Filters the transactions in the response by a payment instrument type. Value is either:

- `CREDITCARD`. Returns a direct credit card transaction with a corresponding value.
- `DEBITCARD`. Returns a debit card transaction with a corresponding value.
If you omit this parameter, the API does not …
- `store_id` (query): Filters the transactions in the response by a store ID.
- `terminal_id` (query): Filters the transactions in the response by a terminal ID.
- `fields` (query): Indicates which fields appear in the response. Value is a single field or a comma-separated list of fields. The `transaction_info` value returns only the transaction details in the response. To include all fields in the response, specify `fields=all`. Valid fields are:

- `transaction_info`. The …
- `balance_affecting_records_only` (query): Indicates whether the response includes only balance-impacting transactions or all transactions. Value is either:

- `Y`. The default. The response includes only balance transactions.
- `N`. The response includes all transactions.
- `page_size` (query): The number of items to return in the response. So, the combination of `page=1` and `page_size=20` returns the first 20 items. The combination of `page=2` and `page_size=20` returns the next 20 items.
- `page` (query): The zero-relative start index of the entire list of items that are returned in the response. So, the combination of `page=1` and `page_size=20` returns the first 20 items.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists transactions .
- default: The default response.

### List all balances

`GET /v1/reporting/balances`

List all balances. Specify date time to list balances for that time that appear in the response.Notes: 

- It takes a maximum of three hours for balances to appear in the list balances call.
- This call lists balances upto the previous three years.

Parameters:

- `as_of_time` (query): List balances in the response at the date time provided, will return the last refreshed balance in the system when not provided.
- `currency_code` (query): Filters the transactions in the response by a [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) for the PayPal transaction currency.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists balances .
- 400: The request is not well-formed, is syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 500: An internal server error occurred.
- default: The default response.

## Schemas

### account_id

The PayPal payer ID, which is a masked version of the PayPal account number intended for use with third parties. The account number is reversibly encrypted and a proprietary variant of Base32 is used to encode the result.

### address

A simple postal address with coarse-grained fields. Do not use for an international address. Use for backward compatibility only. Does not contain phone.

- `line1` (string, required): The first line of the address. For example, number or street.
- `line2` (string): The second line of the address. For example, suite or apartment number.
- `city` (string, required): The city name.
- `state` (string): The [code](/docs/api/reference/state-codes/) for a US state or the equivalent for other countries. Required for transactions if the address is in one of these countries: [Argentina](/docs/api/reference/state-codes/#argentina), [Brazil](/docs/api/reference/state-codes/#brazil), [Canada](/docs/api/reference/state-codes/#canada), [China](/docs/api/reference/state-codes/#china), …
- `country_code` (country_code, required): 
- `postal_code` (string): The postal code, which is the zip code or equivalent. Typically required for countries with a postal code or an equivalent. See [postal code](https://en.wikipedia.org/wiki/Postal_code).

### auction_info

The auction information.

- `auction_site` (string): The name of the auction site.
- `auction_item_site` (string): The auction site URL.
- `auction_buyer_id` (string): The ID of the buyer who makes the purchase in the auction. This ID might be different from the payer ID provided for the payment.
- `auction_closing_date` (date_time): The date and time when the auction closes, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### balance_detail

The Balance information.

- `currency` (currency_code, required): Currency Code of the balances listed.
- `primary` (boolean): Optional field representing if the currency is primary currency or not.
- `total_balance` (money, required): The total amount in PayPal account. It is the sum of all the other balances.
- `available_balance` (money): The amount of cash in an Account which is at the customer's disposal. This amount is captured at settlement cutoff time in the user's time zone as defined for the user.
- `withheld_balance` (money): Balance withheld in the account. The portion of funds that PayPal holds for the customer that is not currently at the customer's disposal.

### balance_detail_list

An array of balance detail objects.

### balances_response

The balances response information.

- `balances` (balance_detail_list): 
- `account_id` (account_id): 
- `as_of_time` (date_time): The requested date and time or the last date and time when the balances can be served, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `last_refresh_time` (date_time): The date and time when the balances was last refreshed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### cart_info

The cart information.

- `item_details` (item_detail_list): 
- `tax_inclusive` (boolean): Indicates whether the item amount or the shipping amount already includes tax.
- `paypal_invoice_id` (string): The ID of the invoice. Appears for only PayPal-generated invoices.

### checkout_option

A checkout option as a name-and-value pair.

- `checkout_option_name` (string): The checkout option name, such as `color` or `texture`.
- `checkout_option_value` (string): The checkout option value. For example, the checkout option `color` might be `blue` or `red` while the checkout option `texture` might be `smooth` or `rippled`.

### checkout_option_list

An array of checkout options. Each option has a name and value.

### country_code

The [two-character ISO 3166-1 code](/docs/integration/direct/rest/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### currency_code

The [three-character ISO-4217 currency code](/docs/integration/direct/rest/currency-codes/) that identifies the currency.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

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

### incentive_detail

The incentive details.

- `incentive_type` (string): The type of incentive, such as a special offer or coupon.
- `incentive_code` (string): The code that identifies an incentive, such as a coupon.
- `incentive_amount` (money): The incentive amount.
- `incentive_program_code` (string): The incentive program code that identifies a merchant loyalty or incentive program.

### incentive_detail_list

An array of incentive details.

### incentive_info

The incentive details.

- `incentive_details` (incentive_detail_list): 

### item_detail

The item details.

- `item_code` (string): An item code that identifies a merchant's goods or service.
- `item_name` (string): The item name.
- `item_description` (string): The item description.
- `item_options` (string): The item options. Describes option choices on the purchase of the item in some detail.
- `item_quantity` (string): The number of purchased units of goods or a service.
- `item_unit_price` (money): The cost for each instance of goods or a service.
- `item_amount` (money): The amount of the payment for the item.
- `discount_amount` (money): The reduction in price associated with goods or a service.
- `adjustment_amount` (money): An increment or decrement to a purchase amount.
- `gift_wrap_amount` (money): The amount of money charged for gift wrapping an item.
- `tax_percentage` (percentage): A rate, expressed in hundreds, that is used to calculate a levy for the purchase of goods or services.
- `tax_amounts` (item_detail_tax_amount_list): 
- `basic_shipping_amount` (money): The delivery cost.
- `extra_shipping_amount` (money): The cost for expedited delivery of the goods.
- `handling_amount` (money): A charge for processing the purchase of goods or services.
- `insurance_amount` (money): A charge for guaranteeing the quality of a product or delivery of a product.
- `total_item_amount` (money): The sum of all factors, item cost, discounts, tax, shipping, and so on, that goes into the cost of an item.
- `invoice_number` (string): The invoice number. An alphanumeric string that identifies a billing for a merchant.
- `checkout_options` (checkout_option_list): 

### item_detail_list

An array of item details.

### item_detail_tax_amount

The tax levied by a government on the purchase of goods or services.

- `tax_amount` (money): The tax levied by a government on the purchase of goods or services.

### item_detail_tax_amount_list

An array of tax amounts levied by a government on the purchase of goods or services.

### link_description

The request-related [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/docs/integration/direct/rest/currency-codes/).

### name

The name of the party.

- `prefix` (string): The prefix, or title, to the party's name.
- `given_name` (string): When the party is a person, the party's given, or first, name.
- `surname` (string): When the party is a person, the party's surname or family name. Also known as the last name. Required when the party is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.
- `middle_name` (string): When the party is a person, the party's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.
- `suffix` (string): The suffix for the party's name.
- `alternate_full_name` (string): DEPRECATED. The party's alternate name. Can be a business name, nickname, or any other name that cannot be split into first, last name. Required when the party is a business.
- `full_name` (string): When the party is a person, the party's full name.

### payer_info

The payer information.

- `account_id` (string): The PayPal` customer account ID.
- `email_address` (email_address): The email address of the payer.
- `phone_number` (phone): The primary phone number of the payer.
- `address_status` (string): The address status of the payer. Value is either:

- `Y`. Verified.
- `N`. Not verified.
- `payer_status` (string): The status of the payer. Value is `Y` or `N`.
- `payer_name` (name): The payer name.
- `country_code` (country_code): The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region of the payer.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.
- `address` (address): The payer address.

### percentage

The percentage, as a fixed-point, signed decimal number. For example, define a 19.99% interest rate as `19.99`.

### phone

The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### search_response

The search response information.

- `transaction_details` (transaction_detail_list): 
- `account_number` (string): The merchant account number.
- `start_date` (date_time): The start date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `end_date` (date_time): The end date and time or the last date when the data can be served, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `last_refreshed_datetime` (date_time): The date and time when the data was last refreshed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `page` (integer): A zero-relative index of transactions.
- `total_items` (integer): The total number of transactions as an integer beginning with the specified `page` in the full result and not just in this response.
- `total_pages` (integer): The total number of pages, as an `integer`, when the `total_items` is divided into pages of the specified `page_size`.
- `links` (link_description_list): 

### shipping_info

The shipping information.

- `name` (string): The recipient's name.
- `method` (string): The shipping method that is associated with this order.
- `address` (address): The shipping address that is associated with this order.
- `secondary_shipping_address` (address): The secondary shipping address that is associated with this order.

### store_info

The store information.

- `store_id` (string): The ID of a store for a merchant in the system of record.
- `terminal_id` (string): The terminal ID for the checkout stand in a merchant store.

### transaction_detail

The transaction details.

- `transaction_info` (transaction_info): The transaction information.
- `payer_info` (payer_info): The payer information.
- `shipping_info` (shipping_info): The shipping information.
- `cart_info` (cart_info): The cart information.
- `store_info` (store_info): The store information.
- `auction_info` (auction_info): The auction information.
- `incentive_info` (incentive_info): The incentive information.

### transaction_detail_list

An array of transaction detail objects.

### transaction_info

The transaction information.

- `paypal_account_id` (string): The ID of the PayPal account of the counterparty.
- `transaction_id` (string): The PayPal-generated transaction ID.
- `paypal_reference_id` (string): The PayPal-generated base ID. PayPal exclusive. Cannot be altered. Defined as a related, pre-existing transaction or event.
- `paypal_reference_id_type` (string): The PayPal reference ID type. Values: ODR, TXN, SUB, PAP.
- `transaction_event_code` (string): A five-digit transaction event code that classifies the transaction type based on money movement and debit or credit. For example, `T0001`. See [Transaction event codes](/docs/integration/direct/transaction-search/transaction-event-codes/).
- `transaction_initiation_date` (date_time): The date and time when work on a transaction began in the PayPal system, as expressed in the time zone of the account on this side of the payment. Specify the value in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `transaction_updated_date` (date_time): The date and time when the transaction was last changed, as expressed in the time zone of the account on this side of the payment. Specify the value in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `transaction_amount` (money): The all-inclusive gross transaction amount that was transferred between the sender and receiver through PayPal.
- `fee_amount` (money): The PayPal fee amount. All transaction fees are included in this amount, which is the record of fee associated with the transaction.Note: This field contains a value only when a transaction fee is applied and processed for this transaction.
- `discount_amount` (money): The reduction in price offered for goods or services purchased.Note: This discount is for a price reduction that is offered for other than that at a individual item level.
- `insurance_amount` (money): An insurance charge. Guarantees the quality or delivery of a product.
- `sales_tax_amount` (money): The PayPal- or merchant-reported sales tax amount for the transaction.
- `shipping_amount` (money): The PayPal- or merchant-reported shipping amount for the transaction.
- `shipping_discount_amount` (money): The discount on the shipping amount.
- `shipping_tax_amount` (money): The tax on the shipping service.
- `other_amount` (money): The special amount that is added to the transaction.
- `tip_amount` (money): The tip.
- `transaction_status` (string): A code that indicates the transaction status. Value is:Status&nbsp;codeDescription`D`PayPal or merchant rules denied the transaction.`P`The transaction is pending. The transaction was created but waits for another payment process to complete, such as an ACH transaction, before the status changes to `S`.`S`The transaction successfully completed without a denial and after any pending statuses.`V`A …
- `transaction_subject` (string): The subject of payment. The payer passes this value to the payee. The payer controls this data through the interface through which he or she sends the data.
- `transaction_note` (string): A special note that the payer passes to the payee. Might contain special customer requests, such as shipping instructions.
- `payment_tracking_id` (string): The payment tracking ID, which is a unique ID that partners specify to either get information about a payment or request a refund.
- `bank_reference_id` (string): The bank reference ID. The bank provides this value for an ACH transaction.
- `ending_balance` (money): The ending balance.Note: If you specify one or more optional query parameters, the `ending_balance` response field is empty.
- `available_balance` (money): The available amount of transaction currency during the completion of this transaction.
- `invoice_id` (string): The invoice ID that is sent by the merchant with the transaction.Note: If an invoice ID was sent with the capture request, the value is reported. Otherwise, the invoice ID of the authorizing transaction is reported.
- `custom_field` (string): The merchant-provided custom text.Note: Usually, this field includes the unique ID for payments made with MassPay type transaction.
- `protection_eligibility` (string): Indicates whether the transaction is eligible for protection. Value is:

- `01`. Eligible.
- `02`. Not eligible
- `03`. Partially eligible.
- `credit_term` (string): The credit term. The time span covered by the installment payments as expressed in the term length plus the length time unit code.
- `credit_transactional_fee` (money): The overall amount of the credit transaction fee.
- `credit_promotional_fee` (money): The overall amount of the credit promotional fee.
- `annual_percentage_rate` (percentage): The annual percentage rate (APR). Determines the amount of interest a consumer pays to finance a purchase at a merchant.
- `payment_method_type` (string): The payment method that was used for a transaction. Value is `PUI`, `installment`, or `mEFT`.Note: Appears only for pay upon invoice (PUI), installment, and mEFT transactions. Merchants and partners in the EMEA region can use this attribute to note transactions that attract turn-over tax.
- `instrument_type` (string): A high-level classification of the type of financial instrument that was used to fund a payment. The pattern is not provided because the value is defined by an external party. E.g. PAYPAL, CREDIT_CARD, DEBIT_CARD, APPLE_PAY, BANK , VENMO ,Pay Upon Invoice, Pay Later or Alternative Payment Methods (APM).
- `instrument_sub_type` (string): A finer-grained classification of the financial instrument that was used to fund a payment. For example, `Visa card` or a `Mastercard` for a credit card, BANKCARD ,DISCOVER etc. The pattern is not provided because the value is defined by an external party.

---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/payments_payouts_batch_v1.json
title: "PayPal Payouts API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Payouts (version 1.9)

Use the Payouts API to make payments to multiple PayPal or Venmo recipients. The Payouts API is a fast, convenient way to send commissions, rebates, rewards, and general disbursements. You can send up to 15,000 payments per call. If you integrated the Payouts API before September 1, 2017, you receive transaction reports through Payouts Reporting. The Payouts API uses the ISO 8601 Internet date and time format.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### Create batch payout

`POST /v1/payments/payouts`

Creates a batch payout. In the JSON request body, pass a `sender_batch_header` and an `items` array. The `sender_batch_header` defines how to handle the payout. The `items` array defines the payout items.
You can make payouts to one or more recipients.Notes: 

- 
PayPal does not process duplicate payouts. If you specify a `sender_batch_id` that was used in the last 30 days, the API rejects the request with an error message that shows the duplicate `sender_batch_id` and includes a HATEOAS link to the original payout with the same `sender_batch_id`.

If you receive an HTTP `5nn` status code, you can safely retry the request with the same `sender_batch_id`.

- 
The Payouts API does not support build notation (BN) codes. In a future Payouts release, you can optionally provide BN codes in the `PayPal-Partner-Attribution-Id` request header.

For information about the `PayPal-Partner-Attribution-Id` header, see HTTP request headers. To learn about or request a BN code, contact your partner manager or see PayPal Partner Program.

Parameters:

- `PayPal-Request-Id` (header): The server stores keys for 30 days.

Request body: create_payout_request

Responses:

- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows the ID for the payout and payout details. To show payout status, use the `payout_batch_id` value that appears in the response. If the initial scan that checks for syntax errors, missing or duplicated …
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 403: Authorization failed due to insufficient permissions.
- 500: An internal server error has occurred.
- default: The error response.

### Show payout batch details

`GET /v1/payments/payouts/{id}`

Shows the latest status of a batch payout. Includes the transaction status and other data for individual payout items.

Parameters:

- `id` (path, required): The ID of the payout for which to show details.
- `fields` (query): Shows details for only the specified fields.
- `page` (query): A non-zero integer representing the page of the results.
- `page_size` (query): The maximum number of results to return at one time. Value is a non-negative, non-zero integer. If the user chooses pagination, the maximum page is `1000`.
- `total_required` (query): Indicates whether to show the total items and total pages count in the response.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows batch payout details.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The error response.

### Show payout item details

`GET /v1/payments/payouts-item/{payout_item_id}`

Shows details for a payout item, by ID. A `payout_item_id` helps you identify denied payments. If a payment is denied, you can use the `payout_item_id` to identify the payment even if it lacks a `transaction_id`.

Parameters:

- `payout_item_id` (path, required): The ID of the payout item to cancel.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body with a `payout_item_details` object, which contains data about a payout item including the transaction status.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The error response.

### Cancel unclaimed payout item

`POST /v1/payments/payouts-item/{payout_item_id}/cancel`

Cancels an unclaimed payout item, by ID. If no one claims the unclaimed item within 30 days, the API automatically returns the funds to the sender. Use this call to cancel the unclaimed item before the automatic 30-day refund. You can cancel payout items with a `transaction_status` of `UNCLAIMED`.

Parameters:

- `payout_item_id` (path, required): The ID of the payout item to cancel.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code with a JSON response body that shows payout item details.
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The error response.

## Schemas

### alternate_notification_method

Captures additional notification modes to reach out to the receiver regarding this payment.

- `phone` (phone): The mobile phone number of the receiver.

### application_context

Metadata for Venmo transactions.

- `social_feed_privacy` (string): This attribute controls the privacy of a payout transaction in recipient’s feed. PUBLIC, FRIENDS_ONLY & PRIVATE are the values that can be used. PUBLIC - The payment displays on the recipient's public Venmo feed. FRIENDS_ONLY - The payment displays only to the recipient's Venmo friends. PRIVATE - The payment displays only on the recipient's personal feed. Defaults to `PRIVATE` if left blank.
- `holler_url` (string): Link to a Holler sticker. For Venmo recipients, the sticker displays with the payout message. The maximum URL length is 151.
- `logo_url` (string): Link to a logo that displays as the sender's profile image in the recipient's Venmo feed. Used to add or update the business profile image. Max image size: 1024 x 1024 pixels. The image should be square and maximum URL length is 2000.

### batch_enum

The payouts status.

Allowed values: `DENIED`, `PENDING`, `PROCESSING`, `SUCCESS`, `CANCELED`

### create_payout_request

The create payout request.

- `sender_batch_header` (sender_batch_header, required): The sender-provided payout header for a payout request.
- `items` (payout_item_request_list, required): 

### currency

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency` (string, required): The [three-character ISO-4217 currency code](/docs/integration/direct/rest/currency-codes/).
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency codes - ISO 4217](https://www.iso.org/iso-4217-currency-codes.html).

### definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### error

The error details.

- `name` (string, required): The human-readable, unique name of the error.
- `message` (string, required): The message that describes the error.
- `debug_id` (string, required): The PayPal internal ID. Used for correlation purposes.
- `information_link` (string): The information link, or URI, that shows detailed information about this error for the developer.
- `details` (error_details_list): 
- `links` (link_description_list): 

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

### error_details-2

The error details. Required for client-side `4XX` errors.

- `field` (string): The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.
- `value` (string): The value of the field that caused the error.
- `location` (string): The location of the field that caused the error. Value is `body`, `path`, or `query`.
- `issue` (string, required): The unique, fine-grained application-level error code.
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

### funding_source

Identifies a funding source type.

Allowed values: `BALANCE`

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/docs/integration/direct/rest/country-codes/).

### link_description

The request-related [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### name

The name of the party.

- `prefix` (string): The prefix, or title, to the party's name.
- `given_name` (string): When the party is a person, the party's given, or first, name.
- `surname` (string): When the party is a person, the party's surname or family name. Also known as the last name. Required when the party is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.
- `middle_name` (string): When the party is a person, the party's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.
- `suffix` (string): The suffix for the party's name.
- `alternate_full_name` (string): DEPRECATED. The party's alternate name. Can be a business name, nickname, or any other name that cannot be split into first, last name. Required when the party is a business.
- `full_name` (string): When the party is a person, the party's full name.

### payout

The create payout response.

- `batch_header` (payout_header): The payout header.
- `links` (definitions-link_description_list): 

### payout_batch

The PayPal-generated batch status.

- `total_items` (integer): The total number of items in the full result list.
- `total_pages` (integer): The total number of pages.
- `batch_header` (payout_batch_header): A payout header. Includes the generated payout status.
- `items` (payout_batch_items_list): 
- `links` (payout_batch_definitions-link_description_list): 

### payout_batch_definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### payout_batch_header

The payout header that is returned in response to a payout header request. Shows details for an entire payout request.

- `payout_batch_id` (string, required): The PayPal-generated ID for a payout.
- `batch_status` (batch_enum, required): The PayPal-generated payout status. If the payout passes preliminary checks, the status is `PENDING`.
- `time_created` (string): The date and time when processing for the payout began, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `time_completed` (string): The date and time when processing for the payout was completed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `time_closed` (string): The date and time when the payout was closed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). A payout is considered closed when all items in a batch are processed and the available balance from the temporary hold is released.
- `sender_batch_header` (payout_sender_batch_header, required): The original payout header, as provided by the payment sender.
- `funding_source` (funding_source): The ID to differentiate a PayPal balance-funded transaction from a PayPal treasury-funded transaction.
- `amount` (currency): The currency and total amount requested for the payouts.
- `fees` (currency): The currency and amount of the total estimate for the applicable payouts fees. Initially, the fee is `0`. The fee is populated after the payout moves to the `PROCESSING` state.

### payout_batch_items

The payout item status and other details.

- `payout_item_id` (string, required): The ID for the payout item. Viewable when you show details for a payout.
- `transaction_id` (string): The PayPal-generated ID for the transaction.
- `activity_id` (string): The unique PayPal-generated common ID created to link sender side and receiver side transaction. Used for tracking.
- `transaction_status` (transaction_enum): 
- `payout_item_fee` (currency): The fee, in U.S. dollars.
- `payout_batch_id` (string, required): The PayPal-generated ID for the payout.
- `payout_item` (payout_item_detail, required): The sender-provided information for the payout item.
- `currency_conversion` (payout_currency_conversion): The currency conversion applicable for this payout item.
- `time_processed` (string): The date and time when this item was last processed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `errors` (error): 
- `links` (payout_batch_items_definitions-link_description_list): 

### payout_batch_items_definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### payout_batch_items_list

An array of individual items.

### payout_currency_conversion

The currency conversion resource.

- `from_amount` (currency): The amount that is converted from.
- `to_amount` (currency): The amount that is converted to.
- `exchange_rate` (string): The exchange rate that is applied for this payout.

### payout_header

The payout header that is returned in response to a payout header request. Shows details for an entire payout request.

- `payout_batch_id` (string, required): The PayPal-generated ID for a payout.
- `batch_status` (batch_enum, required): The PayPal-generated payout status. If the payout passes preliminary checks, the status is `PENDING`.
- `time_created` (string): The date and time when processing for the payout began, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `sender_batch_header` (payout_sender_batch_header, required): The original payout header, as provided by the payment sender.

### payout_item

The payout item status and other details. A `payout_item_id` helps you identify denied payments. If a payment is denied, you can use the `payout_item_id` to identify the payment even if it lacks a `transaction_id`.

- `payout_item_id` (string, required): The ID for the payout item. Visible when you show details for a payout.
- `transaction_id` (string): The PayPal-generated ID for the transaction.
- `activity_id` (string): The unique PayPal-generated common ID that links the sender- and receiver-side transactions. Used for tracking.
- `transaction_status` (transaction_enum): 
- `payout_item_fee` (currency): The estimate for the payout fee. Initially, the fee is `0`. The fee is populated after the item moves to the `PENDING` state
- `payout_batch_id` (string, required): The PayPal-generated ID for the payout batch.
- `sender_batch_id` (string): A sender-specified ID. Tracks the payout in an accounting system. Should be unique within 30 days.
- `payout_item` (payout_item_detail, required): The sender-provided information for the payout item.
- `currency_conversion` (payout_currency_conversion): The currency conversion applicable for this payout item.
- `time_processed` (string): The date and time when this item was last processed, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `errors` (error): The error details.
- `links` (payout_item_definitions-link_description_list): 

### payout_item_definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### payout_item_detail

The details for a sender-created payout to a single recipient.

- `recipient_type` (recipient_enum): 
- `amount` (currency, required): The currency and amount of payout item. Might be an integer for currencies like `JPY` that are not typically fractional or a decimal fraction for currencies like `TND` that are subdivided into thousandths. For the required number of decimal places for a currency code, see [Currency codes - ISO 4217](https://www.iso.org/iso-4217-currency-codes.html).
- `note` (string): The sender-specified note for notifications. Supports up to 4000 ASCII characters and 1000 non-ASCII characters.
- `receiver` (string, required): The receiver of the payment. Corresponds to the `recipient_type` value in the request.
- `sender_item_id` (string): A sender-specified ID number. Tracks the payout in an accounting system.
- `recipient_name` (name): The name of the recipient where money is credited. For `UNCLAIMED` payments, the recipient name is populated after the payment is claimed.
- `recipient_wallet` (recipient_wallet_enum): The recipient wallet.
- `purpose` (purpose_enum): The purpose of the transaction.

### payout_item_request

The sender-created payout to a recipient.

- `recipient_type` (string): The recipient type. Value is:

- 
`EMAIL`. The unencrypted email. Value is a string of up to 127 single-byte characters.

- 
`PHONE`. The unencrypted phone number.
Note: The PayPal sandbox does not support the `PHONE` recipient type.
- 
`PAYPAL_ID`. The encrypted PayPal account number.

- 
`USER_HANDLE`. User handle (or) Username associated with Venmo account.

If the `sender_batch_header` …
- `amount` (currency, required): The currency and amount to pay the receiver.
- `note` (string): The sender-specified note for notifications. Supports up to 4000 ASCII characters and 1000 non-ASCII characters.
- `receiver` (string, required): The receiver of the payment. Corresponds to the `recipient_type` value in the request. Max value of up to 127 single-byte characters.
- `sender_item_id` (string): The sender-specified ID number. Tracks the payout in an accounting system.
- `recipient_wallet` (string): The recipient wallet.
- `alternate_notification_method` (alternate_notification_method): Captures additional notification modes to reach out to the receiver regarding this payment.
- `notification_language` (language): The language in which to show the payout recipient's email message. Used only when the recipient does not have a PayPal account. If you omit the language or provide invalid language and the recipient does not have a PayPal account, the email message is sent in the language of the merchant's PayPal account.
- `application_context` (application_context): Metadata for accepting additional information from merchants to Venmo.
- `purpose` (purpose_enum): The purpose of the transaction.

### payout_item_request_list

An array of individual payout items.

### payout_sender_batch_header

The sender-provided header for a payout request.

- `sender_batch_id` (string): The sender-specified ID number. Tracks the payout in an accounting system.Note: 
PayPal does not process duplicate payouts. If you specify a `sender_batch_id` that was used in the last 30 days, the API rejects the request with an error message that shows the duplicate `sender_batch_id` and includes a HATEOAS link to the original payout with the same `sender_batch_id`.

If you receive an HTTP …
- `recipient_type` (recipient_enum): 
- `email_subject` (string): The subject line for the email that PayPal sends when payment for a payout item completes. The subject line is the same for all recipients. Value is an alphanumeric string with a maximum length of 255 single-byte characters.
- `email_message` (string): The email message that PayPal sends when the payout item completes. The message is the same for all recipients.

### phone

The phone number in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### purpose_enum

The purpose of the transaction.

Allowed values: `AWARDS`, `PRIZES`, `DONATIONS`, `GOODS`, `SERVICES`, `REBATES`, `CASHBACK`, `DISCOUNTS`, `NON_GOODS_OR_SERVICES`

### recipient_enum

The ID type that identifies the payment receiver.

Allowed values: `EMAIL`, `PHONE`, `PAYPAL_ID`

### recipient_wallet_enum

The wallet where the recipient receives the payout. Payouts to Venmo recipients require a 'note' string and a US mobile phone number.

Allowed values: `PAYPAL`, `VENMO`

### sender_batch_header

The sender-provided payout header for a payout request.

- `sender_batch_id` (string): A sender-specified ID number. Tracks the payout in an accounting system.Note: 
PayPal does not process duplicate payouts. If you specify a `sender_batch_id` that was used in the last 30 days, the API rejects the request with an error message that shows the duplicate `sender_batch_id` and includes a HATEOAS link to the original payout with the same `sender_batch_id`.

If you receive an HTTP `5nn` …
- `recipient_type` (string): The ID type that identifies the recipient of the payment. For example, `EMAIL`.
- `email_subject` (string): The subject line for the email that PayPal sends when payment for a payout item completes. The subject line is the same for all recipients. Value is an alphanumeric string of up to 255 single-byte characters.
- `email_message` (string): The email message that PayPal sends when the payout item completes. The message is the same for all recipients.
- `note` (string): The payouts and item-level notes are concatenated in the email. The maximum combined length of the notes is 1000 characters.

### transaction_enum

The item transaction status.Note: For `POST/v1/payments/payouts-item/{payout_item_id}/cancel`, the only possible `transaction_status` value is `RETURNED`.

Allowed values: `SUCCESS`, `FAILED`, `PENDING`, `UNCLAIMED`, `RETURNED`, `ONHOLD`, `BLOCKED`, `REFUNDED`, `REVERSED`

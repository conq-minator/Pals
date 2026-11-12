---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/invoicing_v2.json
title: "PayPal Invoices API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Invoices (version 2.6)

Use the Invoicing API to create, send, and manage invoices. You can also use the API or webhooks to track invoice payments. When you send an invoice to a customer, the invoice moves from draft to payable state. PayPal then emails the customer a link to the invoice on the PayPal website. Customers with a PayPal account can log in and pay the invoice with PayPal. Alternatively, customers can pay as a guest with a debit card or credit card. For more information, see the Invoicing Overview and the Invoicing Integration Guide.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List invoices

`GET /v2/invoicing/invoices`

Lists invoices. To filter the invoices that appear in the response, you can specify one or more optional query parameters.

Parameters:

- `page` (query): The page number to be retrieved, for the list of templates. So, a combination of `page=1` and `page_size=20` returns the first 20 templates. A combination of `page=2` and `page_size=20` returns the next 20 templates.
- `page_size` (query): The maximum number of templates to return in the response.
- `total_required` (query): Indicates whether the to show `total_pages` and `total_items` in the response.
- `fields` (query): The fields to return in the response. Value is `all` or `none`. To return only the template name, ID, and default attributes, specify `none`.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists invoices with details.
- 400: Invalid request.
- 403: Authorization Error.
- 500: An internal server error has occurred.
- default: The default response.

### Create draft invoice

`POST /v2/invoicing/invoices`

Creates a draft invoice. To move the invoice from a draft to payable state, you must send the invoice.

In the JSON request body, include invoice details including merchant information. The `invoice` object must include an `items` array.Note: The merchant that you specify in an invoice must have a PayPal account in good standing..

Request body: invoice

Responses:

- 201: A successful request returns the HTTP `201 Created` status code. A JSON response body that shows invoice details is returned if you set `prefer=return=representation`.
- 400: Invalid request.
- 403: Authorization Error.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Send invoice

`POST /v2/invoicing/invoices/{invoice_id}/send`

Sends or schedules an invoice, by ID, to be sent to a customer. The action depends on the invoice issue date:

- If the invoice issue date is current or in the past, sends the invoice immediately.
- If the invoice issue date is in the future, schedules the invoice to be sent on that date.
To suppress the merchant's email notification, set the `send_to_invoicer` body parameter to `false`. To send the invoice through a share link and not through PayPal, set the `send_to_recipient` parameter to `false` in the `notification` object. The `send_to_recipient` parameter does not apply to a future issue date because the invoice is scheduled to be sent through PayPal on that date.Notes:

- After you send an invoice, resending it has no effect.
- To send a notification for updates, update the invoice and set the `send_to_recipient` body parameter to `true`.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: notification

Responses:

- 200: A successful request returns the HTTP `200 OK` when the invoice issue date is current date.
- 202: The server has accepted the request and will execute it at a later time.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Send invoice reminder

`POST /v2/invoicing/invoices/{invoice_id}/remind`

Sends a reminder to the payer about an invoice, by ID. In the JSON request body, include a `notification` object that defines the subject of the reminder and other details. Notes:

- API caller can send only 2 reminders in a day.
.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: notification

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Cancel sent invoice

`POST /v2/invoicing/invoices/{invoice_id}/cancel`

Cancels a sent invoice, by ID, and, optionally, sends a notification about the cancellation to the payer, merchant, and CC: emails.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: notification

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Record payment for invoice

`POST /v2/invoicing/invoices/{invoice_id}/payments`

Records a payment for the invoice. If no payment is due, the invoice is marked as `PAID`. Otherwise, the invoice is marked as `PARTIALLY PAID`.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: payment_detail

Responses:

- 200: A successful request returns the HTTP `200 Created` status code and a reference to the recorded payment.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Delete external payment

`DELETE /v2/invoicing/invoices/{invoice_id}/payments/{transaction_id}`

Deletes an external payment, by invoice ID and transaction ID.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.
- `transaction_id` (path, required): The ID of the external refund transaction to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Record refund for invoice

`POST /v2/invoicing/invoices/{invoice_id}/refunds`

Records a refund for the invoice. If all payments are refunded, the invoice is marked as `REFUNDED`. Otherwise, the invoice is marked as `PARTIALLY REFUNDED`.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: refund_detail

Responses:

- 200: A successful request returns the HTTP `200 Created` status code and a reference to the recorded refund.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Delete external refund

`DELETE /v2/invoicing/invoices/{invoice_id}/refunds/{transaction_id}`

Deletes an external refund, by invoice ID and transaction ID.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.
- `transaction_id` (path, required): The ID of the external refund transaction to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Generate QR code

`POST /v2/invoicing/invoices/{invoice_id}/generate-qr-code`

Generates a QR code for an invoice, by ID. The QR code is a PNG image in Base64-encoded format that corresponds to the invoice ID. You can generate a QR code for an invoice and add it to a paper or PDF invoice. When customers use their mobile devices to scan the QR code, they are redirected to the PayPal mobile payment flow where they can view the invoice and pay online with PayPal or a credit card. Before you get a QR code, you must create an invoice and send an invoice to move the invoice from a draft to payable state. Do not include an email address if you do not want the invoice emailed.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Request body: qr_config

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows the QR code as a PNG image.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Generate invoice number

`POST /v2/invoicing/generate-next-invoice-number`

Generates the next invoice number that is available to the merchant. The next invoice number uses the prefix and suffix from the last invoice number and increments the number by one. For example, the next invoice number after `INVOICE-1234` is `INVOICE-1235`.

Request body: fetchtype

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows the next invoice number.
- 400: Invalid request.
- 403: Authorization Error.
- 500: An internal server error has occurred.
- default: The default response.

### Show invoice details

`GET /v2/invoicing/invoices/{invoice_id}`

Shows details for an invoice, by ID.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows invoice details.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Fully update invoice

`PUT /v2/invoicing/invoices/{invoice_id}`

Fully updates an invoice, by ID. In the JSON request body, include a complete `invoice` object. This call does not support partial updates. Notes:

- API caller can change/modify recipient only 2 times in 72 hours.
.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.
- `send_to_recipient` (query): Indicates whether to send the invoice update notification to the recipient.
- `send_to_invoicer` (query): Indicates whether to send the invoice update notification to the merchant.

Request body: invoice

Responses:

- 200: A successful request returns the HTTP `200 OK` status code. A JSON response body that shows invoice details is returned if you set `prefer=return=representation`.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Delete invoice

`DELETE /v2/invoicing/invoices/{invoice_id}`

Deletes a draft or scheduled invoice, by ID. Deletes invoices in the draft or scheduled state only. For invoices that have already been sent, you can cancel the invoice. After you delete a draft or scheduled invoice, you can no longer use it or show its details. However, you can reuse its invoice number.

Parameters:

- `invoice_id` (path, required): The ID of the draft invoice to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Search for invoices

`POST /v2/invoicing/search-invoices`

Searches for and lists invoices that match search criteria. If you pass multiple criteria, the response lists invoices that match all criteria.

Parameters:

- `page` (query): The page number to be retrieved, for the list of templates. So, a combination of `page=1` and `page_size=20` returns the first 20 templates. A combination of `page=2` and `page_size=20` returns the next 20 templates.
- `page_size` (query): The maximum number of templates to return in the response.
- `total_required` (query): Indicates whether the to show `total_pages` and `total_items` in the response.

Request body: search_data

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists the invoices that match the search criteria.
- 400: Invalid request.
- 403: Authorization Error.
- 500: An internal server error has occurred.
- default: The default response.

### List templates

`GET /v2/invoicing/templates`

Lists merchant-created templates with associated details. The associated details include the emails, addresses, and phone numbers from the user's PayPal profile.
The user can select which values to show in the business information section of their template.

Parameters:

- `fields` (query): The fields to return in the response. Value is `all` or `none`. To return only the template name, ID, and default attributes, specify `none`.
- `page` (query): The page number to be retrieved, for the list of templates. So, a combination of `page=1` and `page_size=20` returns the first 20 templates. A combination of `page=2` and `page_size=20` returns the next 20 templates.
- `page_size` (query): The maximum number of templates to return in the response.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists invoices.
- 400: Invalid request.
- 403: Authorization Error.
- 500: An internal server error has occurred.
- default: The default response.

### Create template

`POST /v2/invoicing/templates`

Creates an invoice template. You can use details from this template to create an invoice. You can create up to 50 templates.Note: Every merchant starts with three PayPal system templates that are optimized for the unit type billed. The template includes `Quantity`, `Hours`, and `Amount`.

Request body: template

Responses:

- 201: A successful request returns the HTTP `201 Created` status code. A JSON response body that shows template details is returned if you set `prefer=return=representation`.
- 400: Invalid request.
- 403: Authorization Error.
- 422: Unprocessable Entity.
- 500: An internal server error has occurred.
- default: The default response.

### Show template details

`GET /v2/invoicing/templates/{template_id}`

Shows details for a template, by ID.

Parameters:

- `template_id` (path, required): The ID of the template to delete.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows template details.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Fully update template

`PUT /v2/invoicing/templates/{template_id}`

Fully updates a template, by ID. In the JSON request body, include a complete `template` object. This call does not support partial updates.

Parameters:

- `template_id` (path, required): The ID of the template to delete.

Request body: template

Responses:

- 200: A successful request returns the HTTP `200 OK` status code. A JSON response body that shows template details is returned if you set `prefer=return=representation`.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### Delete template

`DELETE /v2/invoicing/templates/{template_id}`

Deletes a template, by ID.

Parameters:

- `template_id` (path, required): The ID of the template to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### List Connections.

`GET /v2/invoicing/accounting-sync/merchant/connections`

Lists connections to accounting platforms per merchant.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

### List Connection Status for an Invoice.

`GET /v2/invoicing/accounting-sync/invoices/{id}/connections`

Lists connections to accounting platforms per invoice.

Parameters:

- `id` (path, required): The invoice id of the account.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body.
- 400: Invalid request.
- 403: Authorization Error.
- 404: Resource Not Found.
- 500: An internal server error has occurred.
- default: The default response.

## Schemas

### 400

- `details` (array of object | object): 

### 403

- `details` (array of object): 

### 422

- `details` (array of object): 

### address_details

The non-portable additional address details that are sometimes needed for compliance, risk, or other scenarios where fine-grain address information might be needed. Not portable with common third party and open source. Redundant with core fields.
For example, `address_portable.address_line_1` is usually a combination of `address_details.street_number`, `street_name`, and `street_type`.

- `street_number` (string): The street number.
- `street_name` (string): The street name. Just `Drury` in `Drury Lane`.
- `street_type` (string): The street type. For example, avenue, boulevard, road, or expressway.
- `delivery_service` (string): The delivery service. Post office box, bag number, or post office name.
- `building_name` (string): A named locations that represents the premise. Usually a building name or number or collection of buildings with a common name or number. For example, `Craven House`.
- `sub_building` (string): The first-order entity below a named building or location that represents the sub-premises. Usually a single building within a collection of buildings with a common name. Can be a flat, story, floor, room, or apartment.

### address_portable

The portable international postal address. Maps to [AddressValidationMetadata](https://github.com/googlei18n/libaddressinput/wiki/AddressValidationMetadata) and HTML 5.1 [Autofilling form controls: the autocomplete attribute](https://www.w3.org/TR/html51/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute).

- `address_line_1` (string): The first line of the address. For example, number or street. For example, `173 Drury Lane`. Required for data entry and compliance and risk checks. Must contain the full address.
- `address_line_2` (string): The second line of the address. For example, suite or apartment number.
- `address_line_3` (string): The third line of the address, if needed. For example, a street complement for Brazil, direction text, such as `next to Walmart`, or a landmark in an Indian address.
- `admin_area_4` (string): The neighborhood, ward, or district. Smaller than `admin_area_level_3` or `sub_locality`. Value is:

- The postal sorting code for Guernsey and many French territories, such as French Guiana.
- The fine-grained administrative levels in China.
- `admin_area_3` (string): A sub-locality, suburb, neighborhood, or district. Smaller than `admin_area_level_2`. Value is:

- Brazil. Suburb, bairro, or neighborhood.
- India. Sub-locality or district. Street name information is not always available but a sub-locality or district can be a very small area.
- `admin_area_2` (string): A city, town, or village. Smaller than `admin_area_level_1`.
- `admin_area_1` (string): The highest level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. Format for postal delivery. For example, `CA` and not `California`. Value, by country, is:

- UK. A county.
- US. A state.
- Canada. A province.
- Japan. A prefecture.
- Switzerland. A kanton.
- `postal_code` (string): The postal code, which is the zip code or equivalent. Typically required for countries with a postal code or an equivalent. See [postal code](https://en.wikipedia.org/wiki/Postal_code).
- `country_code` (country_code, required): 
- `address_details` (address_details): 

### address_portable_list

An array of addresses in the user's PayPal profile.

### aggregated_discount

The discount. Can be an item- or invoice-level discount, or both. Can be applied as a percent or amount. If you provide both amount and percent, amount takes precedent.

- `invoice_discount` (discount): The discount as a percent or amount at invoice level. The invoice discount amount is subtracted from the item total.
- `item_discount` (money): The discount as a percent or amount at item level. The item discount amount is subtracted from each item amount.

### amount_range

The amount range.

- `lower_amount` (money, required): The lower limit of the amount range.
- `upper_amount` (money, required): The upper limit of the amount range.

### amount_summary_detail

The invoice amount summary of item total, discount, tax total, and shipping.

- `currency_code` (currency_code): 
- `value` (string): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/docs/integration/direct/rest/currency-codes/).
- `breakdown` (amount_with_breakdown): The breakdown of the amount. Breakdown provides details such as total item amount, total tax amount, custom amount, shipping and discounts, if any.

### amount_with_breakdown

The breakdown of the amount. Includes total item amount, total tax amount, custom amount, and shipping and discounts, if any.

- `item_total` (money): The subtotal for all items. Must equal the sum of (`items[].unit_amount` * `items[].quantity`) for all items.
- `discount` (aggregated_discount): The discount can be at the item or invoice level, or both. Can be applied as a percent or amount. If you provide both amount and percent, amount takes precedent.
- `tax_total` (money): The aggregated amount of the item and shipping taxes.
- `shipping` (shipping_cost): The shipping fee for all items. Includes tax on shipping.
- `custom` (custom_amount): The custom amount to apply to an invoice. If you include a label, you must include the custom amount.

### billing_info

The billing information of the invoice recipient. Includes name, address, email, phone, and language.

### business_name

The business name of the party.

- `business_name` (string): Required. The business name of the party.

### configuration

The invoice configuration details. Includes partial payment, tip, and tax calculated after discount.

### connection

This lists last sync status and connection platform name.

- `platform_name` (string): The name of the platform. This property supports Unicode. The pattern is not provided because the value is defined by an external party.
- `last_sync_time` (date_time): The date and time when the resource is last synced with the accounting platform. This property supports Unicode.
- `last_sync_status` (string): The status of the last sync. This property supports Unicode. Values: IN_PROGRESS, SUCCESS, FAILED.

### connection_list

An array of connection-level details.

### connections

This object contains an array of connection details. It is used to load sync status for a user.

- `connections` (connection_list): 

### connections_list

An array of connection-level details.

### contact_name_address

The contact information of the user. Includes name and address.

### country_code

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### custom_amount

The custom amount to apply to an invoice. If you include a label, you must include a custom amount.

- `label` (string, required): The label to the custom amount of the invoice.
- `amount` (money): The custom amount value. Value is from `-1000000` to `1000000`. Supports up to two decimal places.

### date_no_time

The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.

### date_range

The date range. Filters invoices by creation date, invoice date, due date, and payment date.

- `start` (date_no_time, required): The start date of the range. Filters invoices by creation date, invoice date, due date, and payment date.
- `end` (date_no_time, required): The end date of the range. Filters invoices by creation date, invoice date, due date, and payment date.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### date_time_range

The date and time range. Filters invoices by creation date, invoice date, due date, and payment date.

- `start` (date_time, required): The start date of the range. Filters invoices by creation date, invoice date, due date, and payment date.
- `end` (date_time, required): The end date of the range. Filters invoices by creation date, invoice date, due date, and payment date. Note: The regular expression provides guidance but does not reject all invalid dates.
Minimum length: 20.
Maximum length: 64
Pattern: `^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])[T,t]([0-1][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)([.][0-9]+)?([Zz]|[+-][0-9]{2}:[0-9]{2})$`

### definitions-item_list

An array of invoice line-item information.

### definitions-phone_detail_list

The invoice recipient's phone numbers. Extension number is not supported.

### definitions-recipient_info_list

The billing and shipping information. Includes name, email, address, phone, and language.

### detail

The details of the invoice like notes, terms and conditions, memo, attachments.

- `reference` (string): The reference data. Includes a Purchase Order (PO) number.
- `currency_code` (currency_code, required): The [three-character ISO-4217 currency code](/docs/integration/direct/rest/currency-codes/) that identifies the currency.
- `note` (string): A note to the invoice recipient. Also appears on the invoice notification email.
- `terms_and_conditions` (string): The general terms of the invoice. Can include return or cancellation policy and other terms and conditions.
- `memo` (string): A private bookkeeping memo for the user.
- `attachments` (file_reference_list): 

### discount

The discount as a percent or amount at invoice level. The invoice discount amount is subtracted from the item total.

- `percent` (percentage): The discount as a percentage value. Value is from `0` to `100`. Supports up to five decimal places.
- `amount` (money): The invoice level discount amount. Value is from `0` to `1000000`. Supports up to two decimal places.

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### email_address_list

An array of one or more CC: emails to which notifications are sent. If you omit this parameter, a notification is sent to all CC: email addresses that are part of the invoice.Note: Valid values are email addresses in the `additional_recipients` value associated with the invoice.

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

### fetchtype

Is the fetch type invoice number or id.

- `fetch_id` (boolean): Optional to decide the number or ID.

### fields

The name of the field.

### fields_list

A CSV file of fields to return for the user, if available. Because the invoice object can be very large, field filtering is required. Valid collection fields are `items`, `payments`, `refunds`, `additional_recipients_info`, and `attachments`.

### file_reference

The file reference. Can be a file in PayPal MediaServ, PayPal DMS, or other custom store.

- `id` (string): The ID of the referenced file.
- `reference_url` (string): The reference URL for the file.
- `content_type` (string): The [Internet Assigned Numbers Authority (IANA) media type of the file](https://www.iana.org/assignments/media-types/media-types.xhtml).
- `create_time` (date_time): The date and time when the file was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `size` (string): The size of the file, in bytes.

### file_reference_list

An array of PayPal IDs for the files that are attached to an invoice.

### invoice

The invoice details which includes all information of the invoice like items, billing information.

- `id` (string): The ID of the invoice.
- `parent_id` (string): The parent ID to an invoice that defines the group invoice to which the invoice is related.
- `status` (invoice_status): 
- `detail` (invoice_detail, required): The details of the invoice. Includes the invoice number, date, payment terms, and audit metadata.
- `invoicer` (invoicer_info): The invoicer information. Includes the business name, email, address, phone, fax, tax ID, additional notes, and logo URL.
- `primary_recipients` (recipient_info_list): 
- `additional_recipients` (email_address_list): 
- `items` (item_list): 
- `configuration` (configuration): The invoice configuration details. Includes partial payment, tip, and tax calculated after discount.
- `amount` (amount_summary_detail): The invoice amount summary of item total, discount, tax total and shipping..
- `due_amount` (money): The due amount, which is the balance amount outstanding after payments.
- `gratuity` (money): The amount paid by the payer as gratuity to the invoicer.
- `payments` (payments): List of payments registered against the invoice..
- `refunds` (refunds): List of refunds against this invoice. The invoicing refund details includes refund type, date, amount, and method.
- `links` (link_description_list): 

### invoice_connection_details

Returns invoice connection status with timestamp per invoice.

- `id` (string): The ID of the invoice. This property supports Unicode.
- `connection_status` (connections_list): 

### invoice_creation_flow

The frequency at which the invoice is sent:

- Multiple recipient. Sent to multiple recipients.
- Batch. Sent in a batch.
- Regular single. Sent one time to a single recipient.

Allowed values: `MULTIPLE_RECIPIENTS_GROUP`, `BATCH`, `REGULAR_SINGLE`

### invoice_detail

The details of the invoice. Includes invoice number, date, payment terms, and audit metadata.

### invoice_list

The list of invoices that match the search criteria.

### invoice_number

The invoice number.

- `invoice_number` (string): The invoice number. If you omit this value, the default is the auto-incremented number from the last number.
- `invoice_id` (string): Resource Id.

### invoice_payment_term

The payment term of the invoice. Payment can be due upon receipt, a specified date, or in a set number of days.

### invoice_status

The status of the invoice.

Allowed values: `DRAFT`, `SENT`, `SCHEDULED`, `PAID`, `MARKED_AS_PAID`, `CANCELLED`, `REFUNDED`, `PARTIALLY_PAID`, `PARTIALLY_REFUNDED`, `MARKED_AS_REFUNDED`, `UNPAID`, `PAYMENT_PENDING`, `AUTO_CANCELLED`, `PAID_EXTERNAL`, `REFUNDED_EXTERNAL`, `SHARED`

### invoice_status_list

An array of status values.

### invoicer_info

The invoicer business information that appears on the invoice.

### invoices

An array of merchant invoices. Includes the total invoices count and [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links) for navigation.

- `total_pages` (integer): The total number of pages that are available for the search criteria. Note: Clients MUST NOT assume that the value of total_pages is constant. The value MAY change from one request to the next
- `total_items` (integer): The total number of invoices that match the search criteria.Note: Clients MUST NOT assume that the value of `total_items` is constant. The value MAY change from one request to the next.
- `items` (invoice_list): 
- `links` (link_description_list): 

### invoices.cancel-400

- `details` (array of object | object): 

### invoices.cancel-422

- `details` (array of object | object | object | object | object): 

### invoices.create-400

- `details` (array of object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object): 

### invoices.generate-qr-code-400

- `details` (array of object | object | object): 

### invoices.payments-400

- `details` (array of object | object | object | object | object | object | object | object | object | object | object): 

### invoices.payments-422

- `details` (array of object | object | object): 

### invoices.payments-delete-422

- `details` (array of object): 

### invoices.refunds-400

- `details` (array of object | object | object | object | object | object | object | object | object | object | object): 

### invoices.refunds-422

- `details` (array of object | object): 

### invoices.remind-400

- `details` (array of object | object): 

### invoices.remind-422

- `details` (array of object): 

### invoices.search-invoices-400

- `details` (array of object | object | object | object | object | object | object): 

### invoices.update-400

- `details` (array of object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object): 

### invoices.update-422

- `details` (array of object | object): 

### item

An array of invoice line item information. The maximum items for an invoice is `100`.

- `id` (string): The ID of the invoice line item.
- `name` (string, required): The item name for the invoice line item.
- `description` (string): The item description for the invoice line item.
- `quantity` (string, required): The quantity of the item that the invoicer provides to the payer. Value is from `-1000000` to `1000000`. Supports up to five decimal places.
- `unit_amount` (money, required): The unit price of the item. This does not include tax and discount. Value is from `-1000000` to `1000000`. Supports up to two decimal places.
- `tax` (tax): The tax associated with the item. The tax amount is added to the item total. Value is from `0` to `100`. Supports up to five decimal places.
- `item_date` (date_no_time): The date when the item or service was provided, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *yyyy*-*MM*-*dd*T*z*.
- `discount` (discount): Discount as a percent or amount at invoice level. The invoice discount amount is subtracted from the item total.
- `unit_of_measure` (unit_of_measure): The unit of measure for the invoiced item. For `AMOUNT` the `unit_amount` and `quantity` are not shown on the invoice.Note: If your specify different `unit_of_measure` values for the same invoice, the invoice uses the first value.

### item_list

An array of invoice line item information.

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/api/rest/reference/country-codes/) or [M49 region code](https://unstats.un.org/unsd/methodology/m49/).

### link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### metadata

The audit metadata. Captures all invoicing actions on create, send, update, and cancel.

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
- `alternate_full_name` (string): DEPRECATED. The party's alternate name. Can be a business name, nickname, or any other name that cannot be split into first, last name. Required when the party is a business.
- `full_name` (string): When the party is a person, the party's full name.

### notification

The email or SMS notification to send to the invoicer or payer on sending an invoice.

- `subject` (string): The subject of the email that is sent as a notification to the recipient.Note: User-provided values for this field will not be honored and the subject will always be defaulted to a system-defined value.
- `note` (string): A note to the payer.Note: User-provided values for this field will not be honored and the note will always be defaulted to a system-defined value.
- `send_to_invoicer` (boolean): Indicates whether to send a copy of the email to the merchant.
- `send_to_recipient` (boolean): Indicates whether to send a copy of the email to the recipient.
- `additional_recipients` (email_address_list): 

### partial_payment

The partial payment details. Includes the minimum amount that the invoicer expects from the payer.

- `allow_partial_payment` (boolean): Indicates whether the invoice allows a partial payment. If `false`, the invoice must be paid in full. If `true`, the invoice allows partial payments.Note: This feature is not available for users in `India`, `Brazil`, or `Israel`.
- `minimum_amount_due` (money): The minimum amount allowed for a partial payment. Valid only when `allow_partial_payment` is `true`.

### payment_detail

The payment details of the invoice. Includes payment type, method, date, discount, and transaction type.

- `type` (payment_type): The payment type in an invoicing flow which can be PayPal or an external cash or check payment.
- `payment_id` (string): The ID for a PayPal payment transaction. Required for the `PAYPAL` payment type.
- `payment_date` (date_no_time): The date when the invoice was paid, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *yyyy*-*MM*-*dd* *z*.
- `method` (payment_method, required): The payment mode or method through which the invoicer can accept the payment.
- `note` (string): A note associated with an external cash or check payment.
- `amount` (money): The payment amount to record against the invoice. If you omit this parameter, the total invoice amount is marked as paid. This amount cannot exceed the amount due.
- `shipping_info` (contact_name_address): The recipient's shipping information. Includes the user's contact information, which includes name and address.

### payment_detail_list

An array of payment details for the invoice. The payment details of the invoice like payment type, method, date, discount and transaction type.

### payment_method

The payment mode or method through which the invoicer can accept the payments.

Allowed values: `BANK_TRANSFER`, `CASH`, `CHECK`, `CREDIT_CARD`, `DEBIT_CARD`, `PAYPAL`, `WIRE_TRANSFER`, `OTHER`

### payment_reference

The reference to the payment detail.

- `payment_id` (string): The ID for the invoice payment.

### payment_term

The payment term of the invoice. Payment can be due upon receipt, a specified date, or in a set number of days.

- `term_type` (payment_term_type): The payment term. Payment can be due upon receipt, a specified date, or in a set number of days.

### payment_term_type

The payment term. Payment can be due upon receipt, a specified date, or in a set number of days.

Allowed values: `DUE_ON_RECEIPT`, `DUE_ON_DATE_SPECIFIED`, `NET_10`, `NET_15`, `NET_30`, `NET_45`, `NET_60`, `NET_90`, `NO_DUE_DATE`

### payment_type

The payment type. Can be PayPal or an external payment. Includes cash or a check.

Allowed values: `PAYPAL`, `EXTERNAL`

### payments

An array of payments registered against the invoice.

- `paid_amount` (money): The aggregated payment amounts against this invoice.
- `transactions` (payment_detail_list): 

### percentage

The percentage, as a fixed-point, signed decimal number. For example, define a 19.99% interest rate as `19.99`.

### phone

The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### phone_detail

The phone details. Includes the phone number and type.

### phone_detail_list

An array of invoicer's phone numbers. The invoicer can choose to hide the phone number on the invoice.

### phone_type

The phone type.

Allowed values: `FAX`, `HOME`, `MOBILE`, `OTHER`, `PAGER`

### qr_config

The configuration for a QR code.

- `width` (integer): The width, in pixels, of the QR code image. Value is from `150` to `500`.
- `height` (integer): The height, in pixels, of the QR code image. Value is from `150` to `500`.
- `action` (string): The type of URL for which to generate a QR code. Valid values are `pay` and `details`.

### recipient_info

The billing and shipping information. Includes name, email, address, phone, and language.

- `billing_info` (billing_info): The billing information for the invoice recipient. Includes name, address, email, phone, and language.
- `shipping_info` (contact_name_address): The recipient's shipping information. Includes the user's contact information, which includes name and address.

### recipient_info_list

The billing and shipping information. Includes name, email, address, phone and language.

### refund_detail

The refund details of the invoice. Includes the refund type, date, amount, and method.

- `type` (payment_type): The PayPal refund type. Indicates whether the refund was paid through PayPal or externally in the invoicing flow. The record refund method supports the `EXTERNAL` refund type. The `PAYPAL` refund type is supported for backward compatibility.
- `refund_id` (string): The ID for a PayPal payment transaction. Required for the `PAYPAL` payment type.
- `refund_date` (date_no_time): The date when the invoice was refunded, in [Internet date format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, `2014-02-27`.
- `amount` (money): The amount to record as refunded. If you omit the amount, the total invoice paid amount is recorded as refunded.
- `method` (payment_method, required): The payment mode or method through which the invoicer can accept the payments.

### refund_detail_list

An array of refund details for the invoice. Includes the refund type, date, amount, and method.

### refund_reference

The reference to the refund payment detail.

- `refund_id` (string): The ID of the refund of an invoice payment.

### refunds

The invoicing refund details. Includes the refund type, date, amount, and method.

- `refund_amount` (money): The aggregated refund amounts.
- `transactions` (refund_detail_list): 

### restrictive_email_address

The internationalized email address with more restrictive rules. This version restricts the local-part to a dot-atom as defined in https://www.ietf.org/rfc/rfc5322.txt. It does not allow for a quoted-string or an obs-local-part. 

- Allows alphanumeric and RFC-allowed special characters, !#$%&'*+-/=?^_`{|}~
- Ensures that the local part does not start with dot (.), have consecutive dots, or end with dot. Ensures that the domain part does not have consecutive dots.
- Ensures that the local part does not exceed 64 characters.
Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### search_data

The invoice search parameters.

- `recipient_email` (string): Filters the search by the email address.
- `recipient_first_name` (string): Filters the search by the recipient first name.
- `recipient_last_name` (string): Filters the search by the recipient last name.
- `recipient_business_name` (string): Filters the search by the recipient business name.
- `invoice_number` (string): Filters the search by the invoice number.
- `status` (invoice_status_list): 
- `reference` (string): The reference data. Includes a Purchase Order (PO) number.
- `currency_code` (currency_code): The [three-character ISO-4217 currency code](/docs/integration/direct/rest/currency-codes/) that identifies the currency.
- `memo` (string): A private bookkeeping memo for the user.
- `total_amount_range` (amount_range): Filters the search by the total amount.
- `invoice_date_range` (date_range): Filters the search by a date range for the invoice, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `due_date_range` (date_range): Filters the search by a due date range for the invoice, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `payment_date_range` (date_time_range): 
- `creation_date_range` (date_time_range): Filters the search by a creation date range for the invoice, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `archived` (boolean): Indicates whether to list merchant-archived invoices in the response. Value is:

- `true`. Response lists only merchant-archived invoices.
- `false`. Response lists only unarchived invoices.
- `null`. Response lists all invoices.
- `fields` (fields_list): 

### shipping_cost

The shipping fee for all items. Includes tax on shipping.

- `amount` (money): The shipping amount. Value is from `0` to `1000000`. Supports up to two decimal places.
- `tax` (tax): The tax associated with the shipping.

### tax

The tax information. Includes the tax name and tax rate of invoice items. The tax amount is added to the item total.

- `name` (string, required): The name of the tax applied on the invoice items.
- `percent` (percentage, required): The tax rate. Value is from `0` to `100`. Supports up to five decimal places.
- `amount` (money): The calculated tax amount. The tax amount is added to the item total.
- `tax_note` (string): The tax note used to track the tax related data.

### template

The template with invoice details to load with all captured fields.

- `id` (string): The ID of the template.
- `name` (string): The template name.Note: The template name must be unique.
- `default_template` (boolean): Indicates whether this template is the default template. A invoicer can have one default template.
- `template_info` (template_info): The template details. Includes invoicer business information, invoice recipients, items, and configuration.
- `settings` (template_settings): The template settings. Describes which fields to show or hide when you create an invoice.
- `unit_of_measure` (unit_of_measure): The unit of measure for the template. Value is quantity, hours, or amount.
- `standard_template` (boolean): Indicates whether this template is a invoicer-created custom template. The system generates non-custom templates.
- `links` (link_description_list): 

### template_configuration

The template configuration details. Includes tax information, tip, and partial payment.

- `tax_calculated_after_discount` (boolean): Indicates whether the tax is calculated before or after a discount. If `false`, the tax is calculated before a discount. If `true`, the tax is calculated after a discount.
- `tax_inclusive` (boolean): Indicates whether the unit price includes tax.
- `allow_tip` (boolean): Indicates whether the invoice enables the customer to enter a tip amount during payment. If `true`, the invoice shows a tip amount field so that the customer can enter a tip amount. If `false`, the invoice does not show a tip amount field.Note: This feature is not available for users in `Hong Kong`, `Taiwan`, `India`, or `Japan`.
- `partial_payment` (partial_payment): The partial payment details. Includes the minimum amount that the invoicer wants the payer to pay.
- `has_conditional_rule` (boolean): Indicates whether conditional pricing rules are applied to the invoice. If `true`, pricing rules (such as discounts or surcharges based on specific conditions) are applied. If `false`, no conditional pricing rules are applied.

### template_detail

The template-related details. Includes notes, terms and conditions, memo, and attachments.

### template_display_preference

The template display preference.

- `hidden` (boolean): Indicates whether to show or hide this field.

### template_info

The template details. Includes invoicer business information, invoice recipients, items, and configuration.

- `detail` (template_detail): The template-related details. Includes notes, terms and conditions, memo, and attachments.
- `invoicer` (invoicer_info): The invoicer information. Includes business name, email, address, phone, fax, tax ID, additional notes, and logo URL.
- `primary_recipients` (definitions-recipient_info_list): 
- `additional_recipients` (email_address_list): 
- `items` (definitions-item_list): 
- `configuration` (template_configuration): The template configuration details. Includes tax information, tip, and partial payment.
- `amount` (amount_summary_detail): The invoice amount summary of the item total, discount, tax total, and shipping.
- `due_amount` (money): The amount due for the invoice.

### template_item_field

The field names for the invoice line items in the template.

Allowed values: `ITEMS_QUANTITY`, `ITEMS_DESCRIPTION`, `ITEMS_DATE`, `ITEMS_DISCOUNT`, `ITEMS_TAX`

### template_item_setting

The template item setting. Sets a template as the default template or edit template.

- `field_name` (template_item_field): The field name in `template_data` for which to map corresponding display preferences.
- `display_preference` (template_display_preference): The display preference.

### template_item_setting_list

The template item headers display preference.

### template_list

An array of details for each template. If `fields` is `none`, returns only the template name, ID, and default status.

### template_metadata

The audit metadata. Captures all template actions on create and update.

- `create_time` (date_time): The date and time when the resource was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `created_by` (string): The email address of the account that created the resource.
- `last_update_time` (date_time): The date and time when the resource was last edited, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `last_updated_by` (string): The email address of the account that last edited the resource.

### template_settings

The template settings. Sets a template as the default template or edit template.

- `template_item_settings` (template_item_setting_list): 
- `template_subtotal_settings` (template_subtotal_setting_list): 

### template_subtotal_field

The field names in the template for discount, shipping, and custom amounts.

Allowed values: `DISCOUNT`, `SHIPPING`, `CUSTOM`

### template_subtotal_setting

The template subtotal setting. Includes the field name and display preference.

- `field_name` (template_subtotal_field): The field name in `template_data` for which to map corresponding display preferences.
- `display_preference` (template_display_preference): The display preference.

### template_subtotal_setting_list

The template subtotal headers display preference.

### templates

An array of merchant-created templates with associated details that include the emails, addresses, and phone numbers from the user's PayPal profile.

- `addresses` (address_portable_list): 
- `emails` (email_address): An array of emails in the user's PayPal profile.
- `phones` (templates_definitions-phone_detail_list): 
- `templates` (template_list): 
- `links` (link_description_list): 

### templates.create-400

- `details` (array of object | object | object | object | object | object): 

### templates.create-422

- `details` (array of object): 

### templates.delete-403

- `details` (array of object | object): 

### templates.get-403

- `details` (array of object): 

### templates.update-400

- `details` (array of object | object | object | object | object | object): 

### templates_definitions-phone_detail_list

An array of phone numbers in the user's PayPal profile.

### unit_of_measure

The unit of measure for the invoiced item.

Allowed values: `QUANTITY`, `HOURS`, `AMOUNT`

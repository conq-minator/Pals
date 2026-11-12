---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/shipping_shipment_tracking_v1.json
title: "PayPal Shipment Tracking API reference"
audience: developer
region: global
topic: api
docDate: 2026-11-12
---

# Shipment Tracking (version 1.9)

Merchants can use the PayPal Add Tracking API to manage tracking information. Merchants can add tracking numbers and associated information to PayPal. There are 2 ways in which tracking details can be shared to PayPal.
If you have a legacy integration that doesn't use the Orders v2 API, share tracking details through the Add Shipping Tracking API. If you are using the Orders v2 API, share tracking details through the Orders v2 API.After adding these details to PayPal, merchants can:

- Update tracking details.
- Show tracking details.
- Cancel tracking numbers.
For more information, see the Add Tracking API Overview and Add Tracking API Integration Guide.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### Add tracking information for multiple PayPal transactions

`POST /v1/shipping/trackers-batch`

Deprecation notice: Adding tracking details for an order through `/v1/shipping/trackers-batch` is deprecated as its a legacy way of integration. Use the new Orders v2 API to share tracking details with PayPal.Adds tracking information, with or without tracking numbers, for multiple PayPal transactions. Accepts up to 20 tracking IDs. For more information, see Add tracking information with tracking numbers and Add tracking information without tracking numbers.

Responses:

- 200: A successful request returns the HTTP 200 OK status code and a JSON response body that shows tracking information.
- 400: The request is not well-formed, syntactically incorrect, or violates schema.
- 403: The authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The error response.

### List tracking information

`GET /v1/shipping/trackers`

Lists tracking information that meet search criteria. The tracking ID is required but the tracking number is optional.

Parameters:

- `transaction_id` (query, required): Filters the tracking information that appears in the response by a PayPal transaction ID.
- `tracking_number` (query): Filters the tracking information that appears in the response by a tracking number.
- `account_id` (query): Encrypted PayPal Account ID of the buyer or seller.

Responses:

- 200: A successful request returns the HTTP 200 OK status code and a JSON response body that lists tracking information that meets search criteria.
- default: The error response.

### Add tracking information for PayPal transaction

`POST /v1/shipping/trackers`

Adds tracking information for a PayPal transaction.

Responses:

- 200: A successful request returns the HTTP 200 OK status code and a JSON response body that shows tracking information.
- default: The error response.

### Show tracking information

`GET /v1/shipping/trackers/{id}`

Shows tracking information, by tracker ID, for a PayPal transaction.

Parameters:

- `id` (path, required): The ID of the tracker in the `transaction_id-tracking_number` format.
- `account_id` (query): Encrypted PayPal Account ID of the buyer or seller.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows tracking information.
- default: The error response.

### Update or cancel tracking information for PayPal transaction

`PUT /v1/shipping/trackers/{id}`

Updates or cancels the tracking information for a PayPal transaction, by ID. To cancel tracking information, call this method and set the status to CANCELLED. For more information, see Update or cancel tracking information.

Parameters:

- `id` (path, required): The ID of the tracker in the `transaction_id-tracking_number` format.

Request body: tracker

Responses:

- 204: A successful request returns the HTTP 204 OK status code with no JSON response body.
- default: The error response.

## Schemas

### batch_tracker_collection

The add tracking information for multiple PayPal transactions response details.

- `tracker_identifiers` (tracker_identifier_list): 
- `errors` (error_list): 
- `links` (batch_tracker_collection_definitions-link_description_list): 

### batch_tracker_collection_definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### carrier

The carrier for the shipment. Carrier information is required when tracking_number is provided. Some carriers have a global version as well as local subsidiaries. The subsidiaries are repeated over many countries and might also have an entry in the global list. Choose the carrier for your country. If the carrier is not available for your country, choose the global version of the carrier. If your carrier name is not in the list, set `carrier` to `OTHER` and set carrier name in `carrier_name_other`. For allowed values, see Carriers.

Allowed values: `2EBOX`, `360LION`, `3JMSLOGISTICS`, `4_72`, `6LS`, `A1POST`, `AAA_COOPER`, `ABCUSTOM`, `ABXEXPRESS_MY`, `ACOMMMERCE`, `ACSWORLDWIDE`, `ACS_GR`, `ADERONLINE`, `ADICIONAL`, `ADSONE`, `ADUIEPYLE`, `AERONET`, `AEX`, `AFLLOG_FTP`, `AGILITY`, `AIRMEE_WEBHOOK`, `AIR_CANADA_GLOBAL`, `ALFATREX`, `ALLIEDEXPRESS`, `ALLJOY`, `ALPHAFAST`, `ALWAYS_EXPRESS`, `AMAZON`, `AMAZON_FBA_SWISHIP`, `AMAZON_SHIP_MCF`, `AMSTAN`, `AMS_GRP`, `ANDREANI`, `ANICAM_BOX`, `ANJUN`, `ANSERX`, `AN_POST`, `AO_COURIER`, `AO_DEUTSCHLAND`, `APC_OVERNIGHT`

### date_no_time

The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### definitions-link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links) that are either relevant to the issue by providing additional information or offering potential resolutions.

### definitions-tracker_identifier_list

An array of tracking IDs.

### error

The error details.

- `name` (string, required): The human-readable, unique name of the error.
- `message` (string, required): The message that describes the error.
- `debug_id` (string, required): The PayPal internal ID. Used for correlation purposes.
- `information_link` (string): The information link, or URI, that shows detailed information about this error for the developer.
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
- `description` (string): The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.
- `links` (definitions-link_description_list): 

### error_details_list

An array of additional details about the error.

### error_link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, PATCH.

### error_list

An array of error responses.

### error_location

The location of the field that caused the error. Value is `body`, `path`, or `query`.

Allowed values: `body`, `path`, `query`

### link_description

A request-related [HATEOAS link](/api/rest/responses/#hateoas-links).

- `href` (string, required): The complete target URL. To make the related call, combine the method with this link, in [URI template format](https://tools.ietf.org/html/rfc6570). Include the `$`, `(`, and `)` characters for pre-processing. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description-2

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### tracker

The tracking information for a shipment.

- `transaction_id` (string, required): The PayPal transaction ID.
- `tracking_number` (string): The tracking number for the shipment. Carrier information, `carrier` is required if tracking_number is provided.
- `tracking_number_type` (tracking_number_type): The type of tracking number.
- `status` (tracking_status, required): 
- `shipment_date` (date_no_time): The date when the shipment occurred, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `carrier` (carrier): 
- `carrier_name_other` (string): The name of the carrier for the shipment. Provide this value only if the carrier parameter is OTHER.
- `postage_payment_id` (string): The postage payment ID.
- `notify_buyer` (boolean): If true , sends an email notification to the buyer of the PayPal transaction. The email contains the tracking information that was uploaded through the API.
- `quantity` (integer): The quantity of items shipped.
- `tracking_number_validated` (boolean): Indicates whether the carrier validated the tracking number.
- `last_updated_time` (date_time): The date and time when the tracking information was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `shipment_direction` (string): To denote whether the shipment is sent forward to the receiver or returned back. Values: FORWARD, RETURN.
- `shipment_uploader` (string): To denote which party uploaded the shipment tracking info. Values: MERCHANT, CONSUMER, PARTNER.
- `account_id` (string): Encrypted PayPal Account ID of the buyer or seller.
- `tracking_url` (string): Tracking Link of the shipment.
- `links` (link_description_list): 

### tracker_collection

The add tracking information for one or more transactions response details.

- `trackers` (tracker_list): 
- `links` (link_description_list): 

### tracker_identifier

The tracking identifiers for a shipment.

- `transaction_id` (string, required): The PayPal transaction ID.
- `tracking_number` (string): The tracking number for the shipment.
- `links` (link_description_list): 

### tracker_identifier_collection

The add tracking information for a PayPal transaction response details.

- `tracker_identifiers` (definitions-tracker_identifier_list): 
- `links` (tracker_identifier_collection_definitions-link_description_list): 

### tracker_identifier_collection_definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### tracker_identifier_list

The batch header.

### tracker_list

An array of tracking information for shipments.

### tracking_number_type

The tracking number type.

Allowed values: `CARRIER_PROVIDED`, `E2E_PARTNER_PROVIDED`

### tracking_status

The status of the item shipment. For allowed values, see Shipping Statuses.

Allowed values: `CANCELLED`, `DELIVERED`, `LOCAL_PICKUP`, `ON_HOLD`, `SHIPPED`, `SHIPMENT_CREATED`, `DROPPED_OFF`, `IN_TRANSIT`, `RETURNED`, `LABEL_PRINTED`, `ERROR`, `UNCONFIRMED`, `PICKUP_FAILED`, `DELIVERY_DELAYED`, `DELIVERY_SCHEDULED`, `DELIVERY_FAILED`, `INRETURN`, `IN_PROCESS`, `NEW`, `VOID`, `PROCESSED`, `NOT_SHIPPED`, `COMPLETED`

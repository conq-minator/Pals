---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/notifications_webhooks_v1.json
title: "PayPal Webhooks Management API reference"
audience: developer
region: global
topic: api
docDate: 2026-11-12
---

# Webhooks Management (version 1.11)

The PayPal REST APIs use webhooks for event notification. Webhooks are HTTP callbacks that receive notification messages for events. After you configure a webhook listener for your app, you can create a webhook, which subscribes the webhook listener for your app to events. The `notifications` namespace contains resource collections for webhooks.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List webhooks

`GET /v1/notifications/webhooks`

Lists webhooks for an app.

Parameters:

- `anchor_type` (query): Filters the webhooks in the response by an `anchor_id` entity type.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists webhooks with webhook details.
- default: The error response.

### Create webhook

`POST /v1/notifications/webhooks`

Subscribes your webhook listener to events.

Request body: webhook

Responses:

- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body with a [`webhook`](/docs/api/webhooks/v1/#definition-webhook) object that includes the webhook ID for later use.
- default: The error response.

### Show webhook details

`GET /v1/notifications/webhooks/{webhook_id}`

Shows details for a webhook, by ID.

Parameters:

- `webhook_id` (path, required): The ID of the webhook for which to list subscriptions.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows webhook details.
- default: The error response.

### Update webhook

`PATCH /v1/notifications/webhooks/{webhook_id}`

Updates a webhook to replace webhook fields with new values. Supports only the `replace` operation. Pass a `json_patch` object with `replace` operation and `path`, which is `/url` for a URL or `/event_types` for events. The `value` is either the URL or a list of events.

Parameters:

- `webhook_id` (path, required): The ID of the webhook for which to list subscriptions.

Request body: patch_request

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows webhook details.
- default: The error response.

### Delete webhook

`DELETE /v1/notifications/webhooks/{webhook_id}`

Deletes a webhook, by ID.

Parameters:

- `webhook_id` (path, required): The ID of the webhook for which to list subscriptions.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- default: The error response.

### List event subscriptions for webhook

`GET /v1/notifications/webhooks/{webhook_id}/event-types`

Lists event subscriptions for a webhook, by ID.

Parameters:

- `webhook_id` (path, required): The ID of the webhook for which to list subscriptions.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists event subscriptions for a webhook.
- default: The error response.

### List webhook lookups

`GET /v1/notifications/webhooks-lookup`

Lists webhook lookups.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists webhook lookups with webhook lookup details.
- default: The error response.

### Create webhook lookup

`POST /v1/notifications/webhooks-lookup`

Creates a webhook lookup. A webhook lookup ties the API caller's REST API app to the subject account (or, if no subject is specified, to the API caller's account). If a webhook event is generated for an event that is tied to the account but not to a particular REST API app (for example, payments initiated with the NVP/SOAP APIs or through the user interface on PayPal.com), those webhook events will treated as if they were intended for the REST API app registered in the webhook lookup instead. Webhook events will then be delivered to any webhooks registered to that REST API app.

Responses:

- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows webhook lookup details.
- default: The error response.

### Show webhook lookup details

`GET /v1/notifications/webhooks-lookup/{webhook_lookup_id}`

Shows details for a webhook lookup, by ID.

Parameters:

- `webhook_lookup_id` (path, required): The ID of the webhook lookup to delete.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows webhook lookup details.
- default: The error response.

### Delete webhook lookup

`DELETE /v1/notifications/webhooks-lookup/{webhook_lookup_id}`

Deletes a webhook lookup, by ID.

Parameters:

- `webhook_lookup_id` (path, required): The ID of the webhook lookup to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- default: The error response.

### Verify webhook signature

`POST /v1/notifications/verify-webhook-signature`

Verifies a webhook signature.

Request body: verify_webhook_signature

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows the verification status.
- default: The error response.

### List available events

`GET /v1/notifications/webhooks-event-types`

Lists available events to which any webhook can subscribe. For a list of supported events, see [Webhook event names](/docs/api/notifications/webhooks/event-names/).

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists available events to which any webhook can subscribe.
- default: The error response.

### List event notifications

`GET /v1/notifications/webhooks-events`

Lists webhooks event notifications. Use query parameters to filter the response.

Parameters:

- `page_size` (query): The number of webhook event notifications to return in the response.
- `start_time` (query): Filters the webhook event notifications in the response to those created on or after this date and time and on or before the `end_time` value. Both values are in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6) format. Example: `start_time=2013-03-06T11:00:00Z`.
- `end_time` (query): Filters the webhook event notifications in the response to those created on or after the `start_time` and on or before this date and time. Both values are in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6) format. Example: `end_time=2013-03-06T11:00:00Z`.
- `transaction_id` (query): Filters the response to a single transaction, by ID.
- `event_type` (query): Filters the response to a single event.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists webhooks event notifications.
- default: The error response.

### Show event notification details

`GET /v1/notifications/webhooks-events/{event_id}`

Shows details for a webhooks event notification, by ID.

Parameters:

- `event_id` (path, required): The ID of the webhook event notification to resend.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows webhooks event notification details.
- default: The error response.

### Resend event notification

`POST /v1/notifications/webhooks-events/{event_id}/resend`

Resends a webhook event notification, by ID. Any pending notifications are not resent.

Parameters:

- `event_id` (path, required): The ID of the webhook event notification to resend.

Request body: event_resend

Responses:

- 202: A successful request returns the HTTP `202 Accepted` status code and a JSON response body that shows webhook event notification details.
- default: The error response.

### Simulate webhook event

`POST /v1/notifications/simulate-event`

Simulates a webhook event. In the JSON request body, specify a sample payload.
You need to subscribe to the following webhook events for Pay upon Invoice:
EventTrigger`PAYMENT.CAPTURE.COMPLETED`A payment capture completes.`PAYMENT.CAPTURE.DENIED`A payment capture is denied.`CHECKOUT.PAYMENT-APPROVAL.REVERSED`PayPal reverses a payment capture.

Request body: simulate_event

Responses:

- 202: A successful request returns the HTTP `202 Accepted` status code and a JSON response body that shows details for the mock event.
- default: The error response.

## Schemas

### EventList

A list of webhooks events.

- `events` (event_list): 
- `count` (integer): The number of items in each range of results. Note that the response might have fewer items than the requested `page_size` value.
- `links` (link_description_list): 

### EventTypeList

A list of webhook events.

- `event_types` (event_type_list): 

### WebhookList

A list of webhooks.

- `webhooks` (webhook_list): 

### WebhookLookupList

A list of webhook lookups.

- `webhooks_lookups` (webhooks_lookup_list): 

### definitions-event_type_list

An array of events to which to subscribe your webhook. To subscribe to all events, including events as they are added, specify the asterisk wild card. To replace the `event_types` array, specify the asterisk wild card. To list all supported events, list available events.

### definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links/).

### error

### error-2

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

### error_type

The type of webhook error that occurred.

- `id` (string): The ID for the webhook error type.
- `name` (string, required): The unique error type name.
- `description` (string): A human-readable description of the error type.

### event

A webhook event notification.

- `id` (string): The ID of the webhook event notification.
- `create_time` (string): The date and time when the webhook event notification was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `resource_type` (string): The name of the resource related to the webhook notification event.
- `event_version` (event_version): 
- `event_type` (string): The event that triggered the webhook event notification.
- `summary` (string): A summary description for the event notification.
- `resource_version` (resource_version): 
- `resource` (resource): 
- `links` (link_description_list): 

### event_list

An array of webhooks events.

### event_resend

Resends a webhook event notification, by ID.

- `webhook_ids` (webhook_ids_list): 

### event_type

An event type.

- `name` (string, required): The unique event name.Note: To subscribe to all events, including events as they are added, specify an `*` as the value to represent a wildcard.
- `description` (string): A human-readable description of the event.
- `status` (string): The status of a webhook event.
- `resource_versions` (resource_versions_list): 

### event_type_list

An array of webhook events.

### event_version

The event version in the webhook notification.

### link_description

The request-related [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (number,integer,string,boolean,null,array,object): The value to apply. The `remove` operation does not require a value.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### resource

The resource that triggered the webhook event notification.

### resource_version

The resource version in the webhook notification.

### resource_versions

The ID for an event type. For example, `1.0` or `2.0`.

### resource_versions_list

Identifier for the event type example: 1.0/2.0 etc.

### simulate_event

Simulates a mock webhook event.

- `webhook_id` (string): The ID of the webhook. If omitted, the URL is required.
- `url` (string): The URL for the webhook endpoint. If omitted, the webhook ID is required.
- `event_type` (string, required): The event name. Specify one of the subscribed events. For each request, provide only one event.
- `resource_version` (string): The identifier for event type ex: 1.0/2.0 etc.

### swagger_link_description

### verify_webhook_signature

A verify webhook signature request.

- `auth_algo` (string, required): The algorithm that PayPal uses to generate the signature and that you can use to verify the signature. Extract this value from the `PAYPAL-AUTH-ALGO` response header, which is received with the webhook notification.
- `cert_url` (string, required): The X.509 public key certificate. Download the certificate from this URL and use it to verify the signature. Extract this value from the `PAYPAL-CERT-URL` response header, which is received with the webhook notification.
- `transmission_id` (string, required): The ID of the HTTP transmission. Contained in the `PAYPAL-TRANSMISSION-ID` header of the notification message.
- `transmission_sig` (string, required): The PayPal-generated asymmetric signature. Appears in the `PAYPAL-TRANSMISSION-SIG` header of the notification message.
- `transmission_time` (string, required): The date and time of the HTTP transmission, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Appears in the `PAYPAL-TRANSMISSION-TIME` header of the notification message.
- `webhook_id` (string, required): The ID of the webhook as configured in your Developer Portal account.
- `webhook_event` (event, required): 

### verify_webhook_signature_response

The verify webhook signature response.

- `verification_status` (string, required): The status of the signature verification. Values: SUCCESS, FAILURE.

### webhook

One or more webhook objects.

- `id` (string): The ID of the webhook.
- `url` (string, required): The URL that is configured to listen on `localhost` for incoming `POST` notification messages that contain event information.
- `event_types` (definitions-event_type_list, required): 
- `links` (definitions-link_description_list): 

### webhook_ids

The ID of the webhook event notification to resend.

### webhook_ids_list

An array of webhook account IDs.

### webhook_list

An array of webhooks.

### webhooks_lookup

The webhook lookup details.

- `id` (string): The ID of the webhook lookup.
- `client_id` (string): The application client ID.
- `links` (definitions-link_description_list): 

### webhooks_lookup_list

An array of webhook lookups.

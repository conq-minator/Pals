---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/payment-experience_web_experience_profiles_v1.json
title: "PayPal Payment Experience Web Profiles API reference"
audience: developer
region: global
topic: payments
docDate: 2026-11-12
---

# Payment Experience Web Profiles (version 1.3)

Use the Payment Experience API to create seamless payment experience profiles. For information about how to create a PayPal payment with a web experience profile, see Web experience profiles.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List web experience profiles

`GET /v1/payment-experience/web-profiles`

Lists the latest 20 web experience profiles for a merchant or subject. To show details for these or additional profiles, you can show web experience profile details by ID.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists the latest 20 profiles that the merchant owns, with details. To show details for these or additional profiles, you can show web experience profile details by ID.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Create web experience profile

`POST /v1/payment-experience/web-profiles`

Creates a web experience profile. In the JSON request body, specify the profile name and details.

Parameters:

- `PayPal-Request-Id` (header, required): The server stores keys for three hours.

Responses:

- 200: A successful request, with or without the optional `PayPal-Request-Id` request header, returns the HTTP `201 Created` status code and a JSON response body that shows the profile details and the ID of the profile. Any subsequent calls with the same `PayPal-Request-Id` request header value within a …
- 201: A successful request, with or without the optional `PayPal-Request-Id` request header, returns the HTTP `201 Created` status code and a JSON response body that shows the profile details and the ID of the profile. Any subsequent calls with the same `PayPal-Request-Id` request header value within a …
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Show web experience profile details by ID

`GET /v1/payment-experience/web-profiles/{id}`

Shows details for a web experience profile, by ID.

Parameters:

- `id` (path, required): The ID of the profile to delete.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows the profile details.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Update web experience profile

`PUT /v1/payment-experience/web-profiles/{id}`

Updates a web experience profile, by ID. In the JSON request body, specify the profile details. If your request omits any profile parameters, any previously set values for those parameters are removed.

Parameters:

- `id` (path, required): The ID of the profile to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Partially update web experience profile

`PATCH /v1/payment-experience/web-profiles/{id}`

Partially-updates a web experience profile, by ID. In the JSON request body, specify a patch object, the path of the profile location to update, and a new value.

Parameters:

- `id` (path, required): The ID of the profile to delete.

Request body: patch_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Delete web experience profile

`DELETE /v1/payment-experience/web-profiles/{id}`

Deletes a web experience profile, by ID.

Parameters:

- `id` (path, required): The ID of the profile to delete.

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

## Schemas

### error

The error information.

- `name` (string, required): The human-readable, unique name of the error.
- `debug_id` (string): The PayPal internal ID. Used for correlation purposes.
- `message` (string, required): The message that describes the error.
- `information_link` (string, required): The URI to detailed information related to this error for the developer.
- `details` (error_details_list): 

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

- `field` (string, required): The name of the field that caused the error.
- `issue` (string, required): The reason for the error.

### error_details_list

An array of additional details for the error.

### error_link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, PATCH.

### error_location

The location of the field that caused the error. Value is `body`, `path`, or `query`.

Allowed values: `body`, `path`, `query`

### flow_config

The flow configuration parameters.

- `landing_page_type` (string): The type of landing page to display on the PayPal site for user checkout. To use the non-PayPal account landing page, set to `Billing`. To use the PayPal account login landing page, set to `Login`. Values: login, billing.
- `bank_txn_pending_url` (string): The merchant site URL to display after a bank transfer payment. In Germany, valid only for the Giropay payment method or bank transfer payment method.
- `user_action` (string): Presents either the **Continue** or **Pay Now** checkout flow to the customer.

Default is **Continue**, or `user_action=continue`. When you do not know the final payment amount, accept this default flow, which redirects the customer to the PayPal payment page with the **Continue** button. When the customer clicks **Continue**, the customer can change the payment amount.

When you know the final … Values: COMMIT.
- `return_uri_http_method` (string): The HTTP method to use to redirect the customer to a return URL. Value is `GET` or `POST`. Values: GET, POST.

### input_fields

The input field customization parameters.

- `no_shipping` (integer): Indicates whether PayPal displays shipping address fields on the experience pages. Value is:

- `0`. Displays the shipping address on the PayPal pages.
- `1`. Redacts shipping address fields from the PayPal pages. For digital goods, this field is required and must be `1`.
- `2`. Gets the shipping address from the customer's account profile.
- `address_override` (integer): Indicates whether to display the shipping address that is passed to this call rather than the one on file for this buyer on the PayPal experience pages. Value is:

- `0`. Displays the shipping address on file.
- `1`. Displays the shipping address specified in this call. the customer cannot edit this shipping address.

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (number,integer,string,boolean,null,array,object): The value to apply. The `remove` operation does not require a value.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### presentation

The style and presentation parameters.

- `brand_name` (string): A label that overrides the business name in the PayPal account on the PayPal pages. Character length and limitations: 127 single-byte alphanumeric characters.
- `logo_image` (string): A URL to the logo image. A valid media type is `.gif`, `.jpg`, or `.png`. The image's maximum width is 190 pixels and maximum height is 60 pixels. PayPal crops images that are larger. PayPal places your logo image at the top of the cart review area. PayPal recommends that you store the image on a secure (HTTPS) server. Otherwise, web browsers display a message that checkout pages contain …
- `locale_code` (string): The locale of pages that the PayPal payment experience displays. A valid value is `AU`, `AT`, `BE`, `BR`, `CA`, `CH`, `CN`, `DE`, `ES`, `GB`, `FR`, `IT`, `NL`, `PL`, `PT`, `RU`, or `US`. A 5-character code is also valid for languages in these countries: `da_DK`, `he_IL`, `id_ID`, `ja_JP`, `no_NO`, `pt_BR`, `ru_RU`, `sv_SE`, `th_TH`, `zh_CN`, `zh_HK`, or `zh_TW`.

### web_profile

A payment web experience profile.

- `id` (string): The ID of the web experience profile.
- `name` (string, required): The web experience profile name. Must be unique for a set of profiles for a merchant.
- `temporary` (boolean): Indicates whether the profile persists for three hours or permanently. To persist the profile permanently, set to `false`. To persist the profile for three hours, set to `true`.
- `flow_config` (flow_config): 
- `input_fields` (input_fields): 
- `presentation` (presentation): 

### web_profile_list

An array of web profiles.

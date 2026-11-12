---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/catalogs_products_v1.json
title: "PayPal Catalog Products API reference"
audience: developer
region: global
topic: api
docDate: 2026-11-12
---

# Catalog Products (version 1.0)

Merchants can use the Catalog Products API to create products, which are goods and services.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List products

`GET /v1/catalogs/products`

Lists products.

Parameters:

- `page_size` (query): The number of items to return in the response.
- `page` (query): A non-zero integer which is the start index of the entire list of items that are returned in the response. So, the combination of `page=1` and `page_size=20` returns the first 20 items. The combination of `page=2` and `page_size=20` returns the next 20 items.
- `total_required` (query): Indicates whether to show the total items and total pages in the response.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists products with details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 500: An internal server error has occurred.
- default: The default response.

### Create product

`POST /v1/catalogs/products`

Creates a product.

Parameters:

- `Prefer` (header): The preferred server response upon successful completion of the request. Value is:

- `return=minimal`. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the `id`, `status` and HATEOAS links.
- `return=representation`. …
- `PayPal-Request-Id` (header): The server stores keys for 72 hours.

Request body: product_request_POST

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows product details.
- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that shows product details.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
- 500: An internal server error has occurred.
- default: The default response.

### Show product details

`GET /v1/catalogs/products/{product_id}`

Shows details for a product, by ID.

Parameters:

- `product_id` (path, required): The product ID.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows product details.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 500: An internal server error has occurred.
- default: The default response.

### Update product

`PATCH /v1/catalogs/products/{product_id}`

Updates a product, by ID. You can patch these attributes and objects:Attribute or objectOperations`description`add, replace, remove`category`add, replace, remove`image_url`add, replace, remove`home_url`add, replace, remove

Parameters:

- `product_id` (path, required): The product ID.

Request body: patch_request

Responses:

- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: Bad Request. Request is not well-formed, syntactically incorrect, or violates schema.
- 401: Authentication failed due to missing authorization header, or invalid authentication credentials.
- 403: Authorization failed due to insufficient permissions.
- 404: The specified resource does not exist.
- 422: The requested action could not be performed, semantically incorrect, or failed business validation.
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

- `details` (array of object | object | object): 

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

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

### link_description

The request-related [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/docs/api/overview/#hateoas-links).

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (number,integer,string,boolean,null,array,object): The value to apply. The `remove` operation does not require a value.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### product

The product details.

- `id` (string): The ID of the product.
- `name` (string): The product name.
- `description` (string): The product description.
- `type` (string): The product type. Indicates whether the product is physical or digital goods, or a service. Values: PHYSICAL, DIGITAL, SERVICE.
- `category` (product_category): 
- `image_url` (string): The image URL for the product.
- `home_url` (string): The home page URL for the product.
- `create_time` (date_time): The date and time when the product was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `update_time` (date_time): The date and time when the product was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `links` (link_description_list): 

### product_category

The product category.

Allowed values: `AC_REFRIGERATION_REPAIR`, `ACADEMIC_SOFTWARE`, `ACCESSORIES`, `ACCOUNTING`, `ADULT`, `ADVERTISING`, `AFFILIATED_AUTO_RENTAL`, `AGENCIES`, `AGGREGATORS`, `AGRICULTURAL_COOPERATIVE_FOR_MAIL_ORDER`, `AIR_CARRIERS_AIRLINES`, `AIRLINES`, `AIRPORTS_FLYING_FIELDS`, `ALCOHOLIC_BEVERAGES`, `AMUSEMENT_PARKS_CARNIVALS`, `ANIMATION`, `ANTIQUES`, `APPLIANCES`, `AQUARIAMS_SEAQUARIUMS_DOLPHINARIUMS`, `ARCHITECTURAL_ENGINEERING_AND_SURVEYING_SERVICES`, `ART_AND_CRAFT_SUPPLIES`, `ART_DEALERS_AND_GALLERIES`, `ARTIFACTS_GRAVE_RELATED_AND_NATIVE_AMERICAN_CRAFTS`, `ARTS_AND_CRAFTS`, `ARTS_CRAFTS_AND_COLLECTIBLES`, `AUDIO_BOOKS`, `AUTO_ASSOCIATIONS_CLUBS`, `AUTO_DEALER_USED_ONLY`, `AUTO_RENTALS`, `AUTO_SERVICE`, `AUTOMATED_FUEL_DISPENSERS`, `AUTOMOBILE_ASSOCIATIONS`, `AUTOMOTIVE`, `AUTOMOTIVE_REPAIR_SHOPS_NON_DEALER`, `AUTOMOTIVE_TOP_AND_BODY_SHOPS`, `AVIATION`, `BABIES_CLOTHING_AND_SUPPLIES`, `BABY`, `BANDS_ORCHESTRAS_ENTERTAINERS`, `BARBIES`

### product_collection

The list of products, with details.

- `products` (product_collection_element_list): 
- `total_items` (integer): The total number of items.
- `total_pages` (integer): The total number of pages.
- `links` (link_description_list): 

### product_collection_element

The details for a product in the collection response.

- `id` (string): The ID of the product.
- `name` (string): The product name.
- `description` (string): The product description.
- `create_time` (date_time): The date and time when the product was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `links` (link_description_list): 

### product_collection_element_list

An array of products.

### product_request_POST

The create product request details.

- `id` (string): The ID of the product. You can specify the SKU for the product. If you omit the ID, the system generates it. System-generated IDs have the `PROD-` prefix.
- `name` (string, required): The product name.
- `description` (string): The product description.
- `type` (string, required): The product type. Indicates whether the product is physical or digital goods, or a service. Values: PHYSICAL, DIGITAL, SERVICE.
- `category` (product_category): 
- `image_url` (string): The image URL for the product.
- `home_url` (string): The home page URL for the product.

### products.create-400

- `details` (array of object | object | object | object | object | object): 

### products.patch-400

- `details` (array of object | object | object | object | object): 

### products.patch-422

- `details` (array of object | object): 

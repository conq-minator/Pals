---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/customer_disputes_v1.json
title: "PayPal Disputes API reference"
audience: developer
region: global
topic: disputes
docDate: 2026-11-12
---

# Disputes (version 1.11)

Occasionally, something goes wrong with a customer's order. To dispute a charge, a customer can create a dispute with PayPal. PayPal merchants, partners, and external developers can use the PayPal Disputes API to manage customer disputes.Note: In the live environment, merchants cannot create disputes but can only respond to customer-created disputes. However, merchants can create disputes in the sandbox environment. When you create an app, enable Disputes in the App feature options section.A customer can also ask his or her bank or credit card company to dispute and reverse a charge, which is known as a chargeback. For more information, see Disputes, claims, chargebacks, and bank reversals.

When a customer disputes a charge, you can use this API to provide evidence that the charge is legitimate. To provide evidence or appeal a dispute, you submit a proof of delivery or proof of refund document or notes, which can include logs.

Normally, an agent at PayPal creates a dispute, updates the dispute status, and settles disputes, but now you can run test cases in the sandbox that complete these operations.

Important: The create, cancel, compute metrics, change reason, and validate eligibility methods are available as a limited-release solution at this time. For more information, reach out to your PayPal account manager.
For details, see Disputes Overview documentation.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### List disputes

`GET /v1/customer/disputes`

Lists disputes with a summary set of details, which shows the `dispute_id`, `reason`, `status`, `dispute_state`, `dispute_life_cycle_stage`, `dispute_channel`, `dispute_amount`, `create_time` and `update_time` fields.

To filter the disputes in the response, specify one or more optional query parameters. To limit the number of disputes in the response, specify the `page_size` query parameter.

To list multiple disputes, set these query parameters in the request:

- `page_size=2`
- `start_time` instead of `disputed_transaction_id`

If the response contains more than two disputes, it lists two disputes and includes a HATEOAS link to the next page of results.

Parameters:

- `start_time` (query): Filters the disputes in the response by a creation date and time. The start time must be within the last 180 days. Value is in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.

You can specify …
- `disputed_transaction_id` (query): Filters the disputes in the response by a transaction, by ID.

You can specify either but not both the `start_time` and `disputed_transaction_id` query parameter.
- `page_size` (query): Limits the number of disputes in the response to this value.
- `next_page_token` (query): The token that describes the next page of results to fetch. The list disputes call returns this token in the HATEOAS links in the response.
- `dispute_state` (query): Filters the disputes in the response by a state. Separate multiple values with a comma (`,`). When you specify more than one dispute_state, the response lists disputes that belong to any of the specified dispute_state.
- `update_time_before` (query): The date and time when the dispute was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`. update_time_before must be within the last 180 days and the default is the current time.
- `update_time_after` (query): The date and time when the dispute was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`. update_time_after must be within the last 180 days and the default is the maximum time …

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that lists disputes with a full or summary set of details. Default is a summary set of details, which shows the `dispute_id`, `reason`, `status`, `dispute_amount`, `create_time`, and `update_time` fields for each …
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- default: The error response.

### Show dispute details

`GET /v1/customer/disputes/{id}`

Shows details for a dispute, by ID.Note: The fields that appear in the response depend on the access. For example, if the merchant requests shows dispute details, the customer's email ID does not appear.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows dispute details.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Partially update dispute

`PATCH /v1/customer/disputes/{id}`

Partially updates a dispute, by ID. Seller can update the `communication_detail` value or The partner can add the `partner action` information.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: patch_request

Responses:

- 202: A successfully accepted request returns the HTTP `202 Accepted` status code and a JSON response body that includes a [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) to the ID of the request. The Clients can choose webhook option as well to receive dispute update notification.
- 204: A successful request returns the HTTP `204 No Content` status code with no JSON response body.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Provide evidence

`POST /v1/customer/disputes/{id}/provide-evidence`

Provides evidence for a dispute, by ID. A merchant can provide evidence for disputes with the `WAITING_FOR_SELLER_RESPONSE` status while customers can provide evidence for disputes with the `WAITING_FOR_BUYER_RESPONSE` status. Evidence can be a proof of delivery or proof of refund document or notes, which can include logs. A proof of delivery document includes a tracking number while a proof of refund document includes a refund ID. For other evidence type, notes and documents can be given. Evidences requested from you can be found by checking the type of evidence for the corresponding source under the evidence section of the show dispute details response. The source will be `REQUESTED_FROM_SELLER` for evidences requested from the merchant while it will be `REQUESTED_FROM_BUYER` for evidences requested from the customer. For constraints and rules regarding documents, see documents.
To make this request, specify the evidence in the JSON request body and use the `provide-evidence` link in the HATEOAS links of the show dispute details response. In case the link is not present in the response, you can't provide evidence for the dispute. For information about dispute reasons, see dispute reasons.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- default: The error response.

### Appeal dispute

`POST /v1/customer/disputes/{id}/appeal`

Appeals a dispute, by ID. To appeal a dispute, use the `appeal` link in the HATEOAS links from the show dispute details response. If this link does not appear, you cannot appeal the dispute. Submit new evidence as a document or notes in the JSON request body. For constraints and rules regarding documents, see documents.
To make this request, specify the dispute ID in the URI and specify the evidence in the JSON request body. For information about dispute reasons, see dispute reasons.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- default: The error response.

### Accept claim

`POST /v1/customer/disputes/{id}/accept-claim`

Accepts liability for a claim, by ID. When you accept liability for a claim, the dispute closes in the customer’s favor and PayPal automatically refunds money to the customer from the merchant's account. Allowed accept_claim_type values for the request is available in dispute details allowed response options object.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- default: The error response.

### Settle dispute

`POST /v1/customer/disputes/{id}/adjudicate`

Important: This method is for sandbox use only. Settles a dispute in either the customer's or merchant's favor. Merchants can make this call in the sandbox to complete end-to-end dispute resolution testing, which mimics the dispute resolution that PayPal agents normally complete. To make this call, the dispute `status` must be `UNDER_REVIEW` and `adjudicate` link should be available in the HATEOAS links of the show dispute details response.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: adjudicate

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Update dispute status

`POST /v1/customer/disputes/{id}/require-evidence`

Important: This method is for sandbox use only. Updates the status of a dispute, by ID, from `UNDER_REVIEW` to either:

- `WAITING_FOR_BUYER_RESPONSE`
- `WAITING_FOR_SELLER_RESPONSE`
This status change enables either the customer or merchant to submit evidence for the dispute. To make this call, the dispute `status` must be `UNDER_REVIEW` and `require-evidence` link should be available in the HATEOAS links of the show dispute details response. Specify an `action` value in the JSON request body to indicate whether the status change enables the customer or merchant to submit evidence:If `action` isThe `status` updates to`BUYER_EVIDENCE` `WAITING_FOR_BUYER_RESPONSE``SELLER_EVIDENCE` `WAITING_FOR_SELLER_RESPONSE`.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: require_evidence

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Escalate dispute to claim

`POST /v1/customer/disputes/{id}/escalate`

Escalates the dispute, by ID, to a PayPal claim. To make this call, the stage in the dispute lifecycle must be `INQUIRY`.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: escalate

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Send message about dispute to other party

`POST /v1/customer/disputes/{id}/send-message`

Sends a message about a dispute, by ID, to the other party in the dispute. Merchants and customers can only send messages if the `dispute_life_cycle_stage` value is `INQUIRY`. For constraints and rules regarding documents that can be attached as part of the message, see documents. To send a message, use the `send-message` link in the HATEOAS links of the show dispute details response and specify the message in the JSON request body. In case the link is not present in the response you can't send a message on the dispute.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Make offer to resolve dispute

`POST /v1/customer/disputes/{id}/make-offer`

Makes an offer to the other party to resolve a dispute, by ID. To make this call, the stage in the dispute lifecycle must be `INQUIRY`. If the customer accepts the offer, PayPal automatically makes a refund. Allowed offer_type values for the request is available in dispute details allowed response options object.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: make_offer

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Accept offer to resolve dispute

`POST /v1/customer/disputes/{id}/accept-offer`

The customer accepts the offer from merchant to resolve a dispute, by ID. PayPal automatically refunds the amount proposed by merchant to the customer.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: accept_offer

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 202: A successfully accepted request returns the HTTP `202 Accepted` status code and a JSON response body that includes a [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) to the ID of the request. The request returns `202 Accepted` status in case money movement for the offer is delayed …
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Deny offer to resolve dispute

`POST /v1/customer/disputes/{id}/deny-offer`

Denies an offer that the merchant proposes for a dispute, by ID.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Request body: deny_offer

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Acknowledge returned item

`POST /v1/customer/disputes/{id}/acknowledge-return-item`

Acknowledges that the customer returned an item for a dispute, by ID. A merchant can make this request for disputes with the `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED` reason. Allowed acknowledgement_type values for the request is available in dispute details allowed response options object. For constraints and rules regarding documents, see documents.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

### Provide supporting information for dispute

`POST /v1/customer/disputes/{id}/provide-supporting-info`

Provides supporting information for a dispute, by ID. A merchant or buyer can make this request for disputes if they find the `provide-supporting-info` link in the HATEOAS links in the list disputes response. The party can provide the supporting information to PayPal to defend themselves only when the `dispute_life_cycle_stage` is `CHARGEBACK`, `PRE_ARBITRATION`, or `ARBITRATION`. They can provide a note that describes their part with details or upload any supporting documents to support their side. For constraints and rules regarding documents, see documents.
To make this request, specify the dispute ID in the URI and specify the notes in the JSON request body. This method differs from the provide evidence method which supports only multipart request, where PayPal asks the concerned party for evidence.

Parameters:

- `id` (path, required): The ID of the dispute for which to provide the supporting information.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that includes a link to the dispute.
- 400: The request failed due to a validation error. The request returns the HTTP `400 Bad Request` status code.
- 404: The request failed due to the dispute is not available. The request returns the HTTP `404 Not Found` status code.
- 422: The requested action could not be completed. The request returns the HTTP `422 Unprocessable Entity` status code.
- 500: An internal server error occurred. The request returns the HTTP `500 Internal Server Error` status code.
- default: The error response.

## Schemas

### accept_claim_response_options

The allowed response options when the merchant is accepting the claim.

- `accept_claim_types` (accept_claim_type_list): 

### accept_claim_type

The refund type proposed by the merchant for the dispute.

Allowed values: `REFUND`, `REFUND_WITH_RETURN`, `PARTIAL_REFUND`, `REFUND_WITH_RETURN_SHIPMENT_LABEL`

### accept_claim_type_list

The types of refund the merchant can provide the customer.

### accept_offer

A customer request to accept the offer made by the merchant.

- `note` (string): The customer notes about accepting of offer. PayPal can but the merchant cannot view these notes.

### acknowledge_return_item_response_options

The allowed response options when the seller acknowledges that the buyer has returned an item for the dispute.

- `acknowledgement_types` (acknowledgement_type_list): 

### acknowledgement_type

The type of acknowledgement allowed for the merchant after the customer has returned the item. The merchant can update whether the item was received and is as expected or if the item was not received.

Allowed values: `ITEM_RECEIVED`, `ITEM_NOT_RECEIVED`, `DAMAGED`, `EMPTY_PACKAGE_OR_DIFFERENT`, `MISSING_ITEMS`

### acknowledgement_type_list

The types of response when the merchant acknowledges a returned item.

### action_info

The extended properties for a evidence. Includes additional information such as the action for which the evidence was requested/submitted, and whether the evidence is mandatory.

- `action` (string): The action for which the evidence was requested or submitted. Values: ACKNOWLEDGE_RETURN_ITEM, ACCEPT_CLAIM, PROVIDE_EVIDENCE, APPEAL, CANCEL, CHANGE_REASON, ESCALATE.
- `response_option` (string): The response option for the corresponding action. Possible values:

- Acknowledgement Types
- Accept Claim types
.
- `mandatory` (boolean): Indicates whether the evidence is mandatory for the corresponding action and response option.

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

### adjudicate

A request to settle a dispute in either the customer's or merchant's favor.

- `adjudication_outcome` (string, required): The outcome of the adjudication. Values: BUYER_FAVOR, SELLER_FAVOR.

### adjudication

The Adjudication details for the dispute.

- `type` (adjudication_type, required): The type of adjudication.
- `adjudication_time` (date_time, required): The date and time when the adjudication was done, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `reason` (adjudication_reason): The reason for the adjudication type.
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): The dispute life cycle stage during the adjudication.

### adjudication_list

The Teammate Adjudication details for the dispute.

### adjudication_reason

The reason for the adjudication type.

Allowed values: `AMOUNT_DIFFERENCE_EXPECTED_DUE_TO_FEES`, `BILLING_AGREEMENT_CHANGE_DISCLOSED`, `BILLING_AGREEMENT_CHANGE_NOT_DISCLOSED`, `BILLING_AGREEMENT_DATE_CHANGE_DISCLOSED`, `BILLING_AGREEMENT_DATE_CHANGE_NOT_DISCLOSED`, `BUYER_ATTEMPTED_RETURN`, `BUYER_BILLED_ONLY_ONCE`, `BUYER_CANCELLED_CASE`, `BUYER_CANCELLED_SERVICE`, `BUYER_FAILED_TO_DESCRIBE_ISSUE`, `BUYER_HAS_POSSESSION_OF_THE_MERCHANDISE_OR_SERVICE`, `BUYER_MADE_NO_ATTEMPT_TO_RESOLVE_WITH_SELLER`, `BUYER_NOT_IN_POSSESSION_OF_ITEM_TO_RETURN`, `BUYER_PROVIDED_CREDIT_RECEIPT`, `BUYER_RECEIVED_DUPLICATE_REFUND`, `CANCELLED_PER_TERMS_OF_BILLING_AGREEMENT`, `CARD_NOT_STOLEN`, `CARD_NOT_STOLEN_BEFORE_AUTH`, `CUSTOMER_RECOGNIZES_TRANSACTION`, `DECISION_BASED_ON_AVAILABLE_INFORMATION`, `DELIVERY_AFTER_EXPECTED_DELIVERY_DATE`, `DELIVERY_DUE_WITHIN_EXPECTED_DELIVERY_DATE`, `DELIVERY_OR_SERVICE_REFUSED`, `DOCUMENTATION_MATCHES_AMOUNT_CHARGED`, `DOCUMENTATION_MATCHES_AMOUNT_IN_PAYPAL_ACCOUNT`, `DUPLICATE_ADD_FUNDS`, `EFFORTLESS_SELLER_PROTECTION`, `IN_PERSON_DELIVERY`, `INELIGIBLE_BUYER_PROTECTION_POLICY`, `INELIGIBLE_SELLER_PROTECTION_POLICY`, `INQUIRY_OFFER_ITEM_REPLACED`, `INQUIRY_OFFER_PARTIAL_REFUND`, `INQUIRY_OFFER_REFUND_WITH_ITEM_RETURN`, `INQUIRY_OFFER_REFUND_WITH_REPLACEMENT`, `INVALID_APPEAL_REASON`, `INVALID_CHARGEBACK_SELLER_FAVOUR`, `INVALID_DELIVERY_PROOF`, `INVALID_DELIVERY_PROOF_SIGNATURE`, `INVALID_DOCUMENTATION`, `INVALID_PROOF_OF_SHIPMENT`

### adjudication_type

The type of adjudication.

Allowed values: `DENY_BUYER`, `PAYOUT_TO_BUYER`, `PAYOUT_TO_SELLER`, `RECOVER_FROM_SELLER`

### agreed_refund_details

Details of Agreed Refund between customer and merchant.

- `merchant_agreed_refund` (boolean): Indicates whether merchant has agreed to refund the buyer or not.
- `merchant_agreed_refund_time` (date_time): The date and time proposed by merchant to provide the refund, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### allowed_response_options

The allowed response options for the buyer/seller update actions.

- `acknowledge_return_item` (acknowledge_return_item_response_options): 
- `accept_claim` (accept_claim_response_options): 
- `make_offer` (make_offer_response_options): 

### billing_disputes_properties

The billing issue details.

- `duplicate_transaction` (duplicate_transaction): 
- `incorrect_transaction_amount` (incorrect_transaction_amount): 
- `payment_by_other_means` (payment_by_other_means): 
- `credit_not_processed` (credit_not_processed): 
- `canceled_recurring_billing` (canceled_recurring_billing): 

### buyer

The details for the customer who funds the payment. For example, the customer's first name, last name, and email address.

- `name` (string): The customer's name.

### buyer_escalation_reason

### canceled_recurring_billing

The recurring billing canceled details.

- `expected_refund` (money): 
- `cancellation_details` (cancellation_details): 

### cancellation_details

The cancellation details.

- `cancellation_date` (date_time): The date and time of the cancellation, in [Internet date and time format](http://tools.ietf.org/html/rfc3339#section-5.6).
- `cancellation_number` (string): The cancellation number.
- `cancelled` (boolean): Indicates whether the dispute was canceled.
- `cancellation_mode` (string): Indicates the mode used for order cancellation. Values: CANCELLED_PAYPAL_BILLING_AGREEMENT, WEBSITE, PHONE, EMAIL, WRITTEN, IN_PERSON.

### communication_details

The contact details that a merchant provides to the customer to use to share their evidence documents.

- `email` (email_address): The email address that is provided by the merchant where the customer can share the evidences.
- `note` (string): The merchant provided notes that are visible to both the customer and PayPal.
- `time_posted` (date_time): The date and time when the contact details were posted, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### country_code

The [two-character ISO 3166-1 code](/api/rest/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### credit_not_processed

The credit not processed details.

- `issue_type` (string): The issue type. Values: PRODUCT, SERVICE.
- `expected_refund` (money): 
- `cancellation_details` (cancellation_details): 
- `product_details` (product_details): 
- `service_details` (service_details): 
- `agreed_refund_details` (agreed_refund_details): 

### cryptocurrency

The details needed to represent a specific cryptocurrency balance, such as its symbol and quantity.

- `asset_symbol` (cryptocurrency_symbol, required): 
- `quantity` (cryptocurrency_quantity, required): 
- `quantity_in_subunits` (cryptocurrency_subunits_quantity): 
- `decimals` (cryptocurrency_decimals): 

### cryptocurrency_decimals

The number of decimal digits supported by this cryptocurrency. For example, for Bitcoin this value is 8 because there are 10^8 satoshis in one Bitcoin and for Ethereum it's 18 since there are 10^18 wei in one Ether.

### cryptocurrency_quantity

The quantity of a cryptocurrency asset. This is a decimal number with a scale defined for each cryptocurrency by its founders. For example, Bitcoin (BTC) has 8 as its scale, Ethereum (ETH) has 18 as its scale. The PayPal Cryptocurrency platform handles the scale to 8 digits for Bitcoin. including its forks or offshoots, as well as Ethereum.

### cryptocurrency_subunits_quantity

The quantity of a cryptocurrency asset in the currency's sub units.
Amount is an integer in a string format.
Floating point should be avoided to avoid precision errors. For example: 
- Bitcoin(BTC) has 8 decimals, so 1 BTC will be represented as 100000000 (1 followed by 8 zeroes). 
- Ethereum(ETH) has 18 decimals, so 1 ETH will be represented as 1000000000000000000 (1 followed by 18 zeroes).

### cryptocurrency_symbol

The cryptocurrency symbol or code ticker options. Assigned by liquidity providers and exchanges.

Allowed values: `BTC`, `ETH`, `BCH`, `LTC`, `PYUSD`, `LINK`, `SOL`, `MATIC`

### currency_code

The [three-character ISO-4217 currency code](/api/rest/reference/currency-codes/) that identifies the currency.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### definitions-document_list

An array of evidence documents.

### definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links/).

### definitions-sub_reasons

The sub-reason for the service issue.

Allowed values: `DAMAGED`, `DIFFERENT`, `INCOMPLETE`, `OTHER`

### definitions-sub_reasons_list

An array of sub-reasons for the service issue.

### deny_offer

A customer request to deny the offer made by the merchant.

- `note` (string, required): The customer notes about the denial of offer. PayPal can but the merchant cannot view these notes.

### dispute

The dispute details.

- `dispute_id` (string): The ID of the dispute.
- `create_time` (date_time): The date and time when the dispute was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `update_time` (date_time): The date and time when the dispute was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `disputed_transactions` (transaction_info_list): 
- `reason` (dispute_reason): 
- `status` (status): 
- `dispute_amount` (money): The amount in the transaction that the customer originally disputed. Because customers can sometimes dispute only part of the payment, the disputed amount might be different from the total gross or net amount of the original transaction.
- `dispute_asset` (cryptocurrency): The asset in the transaction that the customer disputed.
- `fee_policy` (fee_policy): Policy that determines whether the fee needs to be charged, retained or returned while moving the money as part of dispute process.
- `external_reason_code` (string): The code that identifies the reason for the credit card chargeback. Each card issuer follows their own standards for defining reason type, code, and its format. For more details about the external reason code, see the card issue site. Available for only unbranded transactions.
- `dispute_outcome` (dispute_outcome): 
- `adjudications` (adjudication_list): 
- `money_movements` (money_movement_list): 
- `fund_movements` (fund_movement_list): 
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): 
- `dispute_channel` (dispute_channel): 
- `messages` (message_list): 
- `extensions` (extensions): 
- `evidences` (evidence_list): 
- `buyer_response_due_date` (date_time): The date and time by when the customer must respond to the dispute, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). If the customer does not respond by this date and time, the dispute is closed in the merchant's favor. For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `seller_response_due_date` (date_time): The date and time by when the merchant must respond to the dispute, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). If the merchant does not respond by this date and time, the dispute is closed in the customer's favor. For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `offer` (offer): 
- `refund_details` (refund_details): 
- `communication_details` (communication_details): 
- `supporting_info` (supporting_info_list): 
- `allowed_response_options` (allowed_response_options): 
- `links` (definitions-link_description_list): 

### dispute_channel

The channel where the customer created the dispute.

Allowed values: `INTERNAL`, `EXTERNAL`, `ALERT`

### dispute_info

The dispute summary information.

- `dispute_id` (string): The ID of the dispute.
- `create_time` (date_time): The date and time when the dispute was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `update_time` (date_time): The date and time when the dispute was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `reason` (dispute_reason): 
- `status` (status): 
- `dispute_state` (dispute_state): 
- `dispute_amount` (money): The amount in the transaction that the customer originally disputed. Because customers can sometimes dispute only part of the payment, the disputed amount might be different from the total gross or net amount of the original transaction.
- `dispute_asset` (cryptocurrency): The asset in the transaction that the customer disputed.
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): 
- `dispute_channel` (dispute_channel): 
- `buyer_response_due_date` (date_time): The date and time by when the customer must respond to the dispute, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). If the customer does not respond by this date and time, the dispute is closed in the merchant's favor. For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `seller_response_due_date` (date_time): The date and time by when the merchant must respond to the dispute, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). If the merchant does not respond by this date and time, the dispute is closed in the customer's favor. For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `links` (definitions-link_description_list): 

### dispute_info_list

An array of disputes that match the filter criteria. Sorted in latest to earliest creation time order.

### dispute_lifecycle_stage

The stage in the dispute lifecycle.

Allowed values: `INQUIRY`, `CHARGEBACK`, `PRE_ARBITRATION`, `ARBITRATION`

### dispute_outcome

The outcome of a dispute.

- `outcome_code` (string): The outcome of a resolved dispute. Values: RESOLVED_BUYER_FAVOUR, RESOLVED_SELLER_FAVOUR, RESOLVED_WITH_PAYOUT, CANCELED_BY_BUYER, ACCEPTED, DENIED, NONE.
- `outcome_reason` (adjudication_reason): The justification for the adjudication outcome.
- `amount_refunded` (money): The amount that either the merchant or PayPal refunds the customer.
- `asset_refunded` (cryptocurrency): The asset that either the merchant or PayPal refunds the customer.

### dispute_reason

The reason for the item-level dispute. For information about the required information for each dispute reason and associated evidence type, see dispute reasons.

Allowed values: `MERCHANDISE_OR_SERVICE_NOT_RECEIVED`, `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED`, `UNAUTHORISED`, `CREDIT_NOT_PROCESSED`, `DUPLICATE_TRANSACTION`, `INCORRECT_AMOUNT`, `PAYMENT_BY_OTHER_MEANS`, `CANCELED_RECURRING_BILLING`, `PROBLEM_WITH_REMITTANCE`, `OTHER`

### dispute_search

An array of disputes. Includes links that enable you to navigate through the response.

- `items` (dispute_info_list): 
- `links` (definitions-link_description_list): 

### dispute_source

The dispute source through which customer initiated the dispute.

Allowed values: `EMAIL`, `WEB`, `CHAT`, `IVR`, `PHONE`, `MOBILE_APP`, `MOBILE_WEB`, `API`

### dispute_state

The user specific state of the dispute, could vary between parties during the dispute lifecycle.

Allowed values: `OPEN_INQUIRIES`, `REQUIRED_ACTION`, `REQUIRED_OTHER_PARTY_ACTION`, `UNDER_PAYPAL_REVIEW`, `APPEALABLE`, `RESOLVED`

### document

An uploaded document as a binary object that supports a dispute.

- `name` (string): The document name.
- `url` (string): The downloadable URL for the document for which the client has access.

Note: Document download may require some configuration setup and available as a limited release at this time. For more information, reach out to your PayPal account manager..

### document_list

An array of metadata for the documents which contains any additional info about the message posted.

### duplicate_transaction

The duplicate transaction details.

- `received_duplicate` (boolean): If `true`, indicates that a duplicate transaction was received.
- `original_transaction` (transaction_info): The transaction details for the original transaction, when the dispute reason is `DUPLICATE_TRANSACTION`. Currently, contains only the date and amount.

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

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

### escalate

A merchant request to escalate a dispute, by ID, to a PayPal claim.

- `note` (string): The notes about the escalation of the dispute to a claim.
- `buyer_escalation_reason` (buyer_escalation_reason): 

### escalate_response

The response for escalate action.

- `links` (definitions-link_description_list): 

### evidence

A merchant- or customer-submitted evidence document. evidence_info is expected for PROOF_OF_FULFILLMENT,PROOF_OF_REFUND and PROOF_OF_RETURN evidence types. documents and notes can be given for rest of the evidence types.

- `evidence_type` (string): The evidence type. Values: PROOF_OF_FULFILLMENT, PROOF_OF_REFUND, PROOF_OF_DELIVERY_SIGNATURE, PROOF_OF_RECEIPT_COPY, RETURN_POLICY, BILLING_AGREEMENT, PROOF_OF_RESHIPMENT, ITEM_DESCRIPTION, POLICE_REPORT, AFFIDAVIT, PAID_WITH_OTHER_METHOD, COPY_OF_CONTRACT, TERMINAL_ATM_RECEIPT, PRICE_DIFFERENCE_REASON, SOURCE_CONVERSION_RATE.
- `evidence_info` (evidence_info): 
- `documents` (definitions-document_list): 
- `notes` (string): Any evidence-related notes.
- `source` (string): The source of the evidence. Values: REQUESTED_FROM_BUYER, REQUESTED_FROM_SELLER, SUBMITTED_BY_BUYER, SUBMITTED_BY_SELLER, SUBMITTED_BY_PARTNER.
- `date` (date_time): The date and time when the evidence was received, in [Internet date and time format](http://tools.ietf.org/html/rfc3339#section-5.6).
- `item_id` (string): The item ID. If the merchant provides multiple pieces of evidence and the transaction has multiple item IDs, the merchant can use this value to associate a piece of evidence with an item ID.
- `item_type` (item_type): The item type for which the evidence is requested or submitted.
- `action_info` (action_info): The action details for the information. Includes additional information such as the action for which the evidence was requested/submitted, and whether the evidence is mandatory for the corresponding action.
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): The dispute life cycle stage for the evidence.

### evidence_info

The evidence-related information.

- `tracking_info` (tracking_info_list): 
- `refund_ids` (refund_ids_list): 

### evidence_list

An array of evidence documents.

### extensions

The extended properties for the dispute. Includes additional information for a dispute category, such as billing disputes, the original transaction ID, and the correct amount.

- `merchant_contacted` (boolean): Indicates that the merchant was contacted.
- `merchant_contacted_outcome` (merchant_contacted_outcome): 
- `merchant_contacted_time` (date_time): The date and time when merchant was contacted.
- `merchant_contacted_mode` (merchant_contacted_mode): The method used to contact the merchant.
- `buyer_contacted_time` (date_time): The date and time when the buyer contacted the partner to file a dispute, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `buyer_contacted_channel` (string): The channel through which the buyer contacted the partner to file a dispute. Partners that allow buyers to create dispute from multiple channels can use this field to help identify which channel was used for each individual dispute.
- `billing_dispute_properties` (billing_disputes_properties): 
- `merchandize_dispute_properties` (merchandize_dispute_properties): 
- `reported_source` (dispute_source): 

### fee_policy

Policy that determines whether the fee needs to be charged, retained or returned while moving the money as part of dispute process.

### fund_movement

This section contains the details about the fund movement of the parties ,time , direction and the reason for it.

- `party` (string): The affected party in the money movement. Values: SELLER, BUYER, PAYMENT_PROCESSOR.
- `amount` (money): The amount transferred as part of the money movement.
- `asset` (cryptocurrency): The asset transferred as part of the money movement.
- `initiated_time` (date_time): The date and time when the money movement was initiated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `type` (string): The type of the money movement. Values: DEBIT, CREDIT.
- `reason` (fund_movement_reason): The reason for the fund movement.

### fund_movement_list

The movements of fund due to the dispute.

### fund_movement_reason

The reason for the fund movement.

Allowed values: `REVERSED_TRANSACTION_FEE`, `DISPUTE_SETTLEMENT`, `DISPUTE_FEE`, `CHARGEBACK_FEE`

### incorrect_transaction_amount

The incorrect transaction amount details.

- `correct_transaction_amount` (money): 
- `correct_transaction_asset` (cryptocurrency): The correct asset quantity of the transaction.
- `correct_transaction_time` (date_time): The date and time when the customer created the transaction, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### item_agreed_refund_details

### item_booking_details

### item_cancellation_details

### item_digital_download_details

### item_info

The information for a purchased item in a disputed transaction.

- `item_id` (string): The item ID. If the merchant provides multiple pieces of evidence and the transaction has multiple item IDs, the merchant can use this value to associate a piece of evidence with an item ID.
- `item_name` (string): The item name.
- `item_description` (string): The item description.
- `item_quantity` (string): The count of the item in the dispute. Must be a whole number.
- `partner_transaction_id` (string): The ID of the transaction in the partner system. The partner transaction ID is returned at an item level because the partner might show different transactions for different items in the cart.
- `reason` (dispute_reason): 
- `dispute_amount` (money): The amount of the item in the dispute.
- `notes` (string): Any notes provided with the item.
- `item_type` (item_type): 
- `product_details` (item_product_details): 
- `service_details` (item_service_details): 
- `booking_details` (item_booking_details): 
- `digital_download_details` (item_digital_download_details): 
- `cancellation_details` (item_cancellation_details): 
- `agreed_refund_details` (item_agreed_refund_details): 

### item_info_list

An array of items that were purchased as part of the transaction.

### item_product_details

### item_service_details

### item_type

The type of the item which has the issue.

Allowed values: `PRODUCT`, `SERVICE`, `BOOKING`, `DIGITAL_DOWNLOAD`

### link_description

The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).

### make_offer

A merchant request to make an offer to resolve a dispute.

- `note` (string, required): The merchant's notes about the offer.
- `offer_amount` (money): The amount proposed to resolve the dispute.
- `return_shipping_address` (address_portable): The return address for the item. Required when the customer must return an item to the merchant for the `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED` dispute reason, especially if the refund amount is less than the dispute amount.
- `invoice_id` (string): The merchant-provided ID of the invoice for the refund. This optional value maps the refund to an invoice ID in the merchant's system.
- `offer_type` (offer_type, required): 

### make_offer_response_options

The allowed response options when the merchant makes offer to the customer.

- `offer_types` (offer_type_list): 

### merchandize_dispute_properties

The customer-provided merchandise issue details for the dispute.

- `issue_type` (string): The issue type. Values: PRODUCT, SERVICE.
- `product_details` (product_details): 
- `service_details` (service_details): 
- `cancellation_details` (cancellation_details): 
- `return_shipping_address` (address_portable): The return address for the item. Required when the customer must return an item to the merchant for the `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED` dispute reason.

### merchant_contacted_mode

The method used to contact the merchant.

Allowed values: `WEBSITE`, `PHONE`, `EMAIL`, `WRITTEN`, `IN_PERSON`

### merchant_contacted_outcome

The outcome when the customer has contacted the merchant.

Allowed values: `NO_RESPONSE`, `FIXED`, `NOT_FIXED`

### message

A customer- or merchant-posted message for the dispute.

- `posted_by` (string): Indicates whether the customer, merchant, or dispute arbiter posted the message. Values: BUYER, SELLER, ARBITER.
- `time_posted` (date_time): The date and time when the message was posted, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `content` (string): The message text.
- `documents` (document_list): 

### message_list

An array of customer- or merchant-posted messages for the dispute.

### money

The currency and amount for a financial transaction, such as a balance or payment due.

- `currency_code` (currency_code, required): 
- `value` (string, required): The value, which might be:

- An integer for currencies like `JPY` that are not typically fractional.
- A decimal fraction for currencies like `TND` that are subdivided into thousandths.
For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).

### money_movement

The Money movement details with party.

- `affected_party` (string): The affected party in the money movement. Values: SELLER, BUYER, PAYMENT_PROCESSOR.
- `amount` (money): The amount transferred as part of the money movement.
- `asset` (cryptocurrency): The asset transferred as part of the money movement.
- `initiated_time` (date_time): The date and time when the money movement was initiated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `type` (string): The type of the money movement. Values: DEBIT, CREDIT.
- `reason` (money_movement_reason): The reason for the money movement.

### money_movement_list

DEPRECATED The Money movement details for the dispute.

### money_movement_reason

The reason for the money movement.

Allowed values: `DISPUTE_SETTLEMENT_FEE`, `DISPUTE_SETTLEMENT`, `DISPUTE_FEE`, `CHARGEBACK_FEE`

### offer

The merchant-proposed offer for a dispute.

- `buyer_requested_amount` (money): The customer-requested refund for this dispute.
- `seller_offered_amount` (money): The merchant-offered refund for this dispute.
- `offer_type` (offer_type): 
- `history` (offer_history_list): 

### offer_history

The offer history.

- `offer_time` (date_time): The date and time when the event occurred, in [Internet date and time format](http://tools.ietf.org/html/rfc3339#section-5.6).
- `actor` (string): The event-related actor. Values: BUYER, SELLER.
- `event_type` (string): The type of the history event. Values: PROPOSED, ACCEPTED, DENIED.
- `offer_type` (offer_type): 
- `offer_amount` (money): The offer amount.
- `notes` (string): The user submitted notes.
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): The dispute life cycle stage during the offer event.

### offer_history_list

An array of history information for an offer.

### offer_type

The merchant-proposed offer type for the dispute.

Allowed values: `REFUND`, `REFUND_WITH_RETURN`, `REFUND_WITH_REPLACEMENT`, `REPLACEMENT_WITHOUT_REFUND`

### offer_type_list

The types of offer the merchant can offer the customer.

### patch

The JSON patch object to apply partial updates to resources.

- `op` (string, required): The operation. Values: add, remove, replace, move, copy, test.
- `path` (string): The JSON Pointer to the target document location at which to complete the operation.
- `value` (object): The value to apply. The `remove`, `copy`, and `move` operations do not require a value. Since JSON Patch allows any type for `value`, the `type` property is not specified.
- `from` (string): The JSON Pointer to the target document location from which to move the value. Required for the `move` operation.

### patch_request

An array of JSON patch objects to apply partial updates to resources.

### payment_by_other_means

The payment by other means details.

- `charge_different_from_original` (boolean): If `true`, indicates that a charge was made that is different from the original charge.
- `received_duplicate` (boolean): If `true`, indicates that a duplicate transaction was received.
- `payment_method` (string): The payment method. Values: CASH, CREDIT_CARD, CHECK, PAYPAL, DEBIT_CARD, GIFT_CARD, BANK_TRANSFER.
- `payment_instrument_suffix` (string): Last 2-4 characters of the payment instrument. For payment_method CHECK, payment_instrument_suffix entered must be of minimum length 2-4 characters. For payment_method CREDIT_CARD, DEBIT_CARD, GIFT_CARD, BANK_TRANSFER, payment_instrument_suffix entered must be of length 4.

### payment_processor

### product_details

The product information.

- `description` (string): The product description.
- `product_received` (string): Indicates whether the product was, or was not, received or returned. Values: YES, NO, RETURNED.
- `product_received_time` (date_time): The date and time when product was delivered.
- `expected_delivery_date` (date_time): The expected delivery date and time of the product.
- `sub_reasons` (sub_reasons_list): 
- `purchase_url` (string): The URL where the customer purchased the product.
- `return_details` (return_details): 

### refund_details

The refund details.

- `allowed_refund_amount` (money): The maximum refundable amount.

### refund_ids

The ID of the refunded transaction.

### refund_ids_list

An array of refund IDs for the transaction involved in this dispute.

### require_evidence

Sandbox only. Updates the state of a dispute, by ID, to either `WAITING_FOR_BUYER_RESPONSE` or `WAITING_FOR_SELLER_RESPONSE`. This state change enables either the customer or merchant to submit evidence for the dispute. Specify an `action` value in the JSON request body to indicate whether the state change enables the customer or merchant to submit evidence.

- `action` (string, required): The action. Indicates whether the state change enables the customer or merchant to submit evidence. Values: BUYER_EVIDENCE, SELLER_EVIDENCE.

### return_details

The return details for the product.

- `return_time` (date_time): The date and time when the product was returned, [Internet date and time format](http://tools.ietf.org/html/rfc3339#section-5.6).
- `mode` (string): The method that the customer used to return the product. Values: SHIPPED, IN_PERSON.
- `receipt` (boolean): Indicates whether customer has the return receipt.
- `return_confirmation_number` (string): The confirmation number for the item return.
- `returned` (boolean): If `true`, indicates that the item was returned but the seller refused to accept the return and if `false`, indicates the item was not attempted to return.

### seller

The details for the merchant who receives the funds and fulfills the order. For example, merchant ID, and contact email address.

- `email` (email_address): The email address for the merchant's PayPal account.
- `merchant_id` (string): The PayPal account ID for the merchant.
- `name` (string): The name of the merchant.

### service_details

The service details.

- `description` (string): The service description.
- `service_started` (string): Indicates whether the service was started or cancelled. Values: YES, NO, CANCELLED.
- `note` (string): The customer specified note about the service usage.
- `sub_reasons` (definitions-sub_reasons_list): 
- `purchase_url` (string): The URL of the merchant or marketplace site where the customer purchased the service.

### status

The overall status of the dispute, constant for all the parties involved at anytime during the dispute lifecycle.

Allowed values: `OPEN`, `WAITING_FOR_BUYER_RESPONSE`, `WAITING_FOR_SELLER_RESPONSE`, `UNDER_REVIEW`, `RESOLVED`, `OTHER`

### sub_reasons

The sub-reason for the product issue.

Allowed values: `DAMAGED`, `DIFFERENT`, `MISSING_PARTS`, `OTHER`

### sub_reasons_list

An array of sub-reasons for the product issue.

### subsequent_action

The subsequent action.

- `links` (definitions-link_description_list): 

### supporting_info

A merchant- or customer-submitted supporting information.

- `notes` (string): Any supporting notes.
- `documents` (supporting_info_definitions-document_list): 
- `source` (string): The source of the Information. Values: SUBMITTED_BY_BUYER, SUBMITTED_BY_SELLER, SUBMITTED_BY_PARTNER.
- `provided_time` (date_time): The date and time when the information was received, in [Internet date and time format](http://tools.ietf.org/html/rfc3339#section-5.6).
- `dispute_life_cycle_stage` (dispute_lifecycle_stage): The dispute life cycle stage for the supporting info.

### supporting_info_definitions-document_list

An array of metadata for the documents which were uploaded as supporting information for the dispute.

### supporting_info_list

An array of all the supporting information that are associated to this dispute.

### tracking_info

The tracking information.

- `carrier_name` (string, required): The name of the shipment carrier for the transaction for this dispute. Values: UPS, USPS, FEDEX, AIRBORNE_EXPRESS, DHL, AIRSURE, ROYAL_MAIL, PARCELFORCE, SWIFTAIR, OTHER, UK_PARCELFORCE, UK_ROYALMAIL_SPECIAL, UK_ROYALMAIL_RECORDED, UK_ROYALMAIL_INT_SIGNED, UK_ROYALMAIL_AIRSURE.
- `carrier_name_other` (string): The name of carrier in free-form text for unavailable carriers. This field is mandatory when `carrier_name` is `OTHER`.
- `tracking_url` (string): The URL to track the dispute-related transaction shipment.
- `tracking_number` (string, required): The number to track the dispute-related transaction shipment.

### tracking_info_list

An array of relevant tracking information for the transaction involved in this dispute.

### transaction_info

The information about the disputed transaction.

- `buyer_transaction_id` (string): The ID, as seen by the customer, for this transaction.
- `seller_transaction_id` (string): The ID, as seen by the merchant, for this transaction.
- `reference_id` (string): The ID, as seen by the partner, for this transaction.
- `create_time` (date_time): The date and time when the transaction was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). For example, *`yyyy`*-*`MM`*-*`dd`*`T`*`HH`*:*`mm`*:*`ss`*.*`SSS`*`Z`.
- `transaction_status` (string): The transaction status. Values: COMPLETED, UNCLAIMED, DENIED, FAILED, HELD, PENDING, PARTIALLY_REFUNDED, REFUNDED, REVERSED, CANCELLED.
- `gross_amount` (money): The gross amount of the transaction.
- `gross_asset` (cryptocurrency): The gross asset of the transaction.
- `invoice_number` (string): The ID of the invoice for the payment.
- `custom` (string): A free-text field that is entered by the merchant during checkout.
- `buyer` (buyer): 
- `seller` (seller): 
- `items` (item_info_list): 
- `payment_processor` (payment_processor): 

### transaction_info_list

An array of transactions for which disputes were created.

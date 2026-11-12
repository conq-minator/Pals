---
source: https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/customer_partner_referrals_v2.json
title: "PayPal Partner Referrals API reference"
audience: developer
region: global
topic: api
docDate: 2026-11-12
---

# Partner Referrals (version 2.5)

Use the Partner Referrals API to add PayPal seller accounts to PayPal Complete Payments Platform for Marketplaces and Platforms. Important: This endpoint is available to approved partners only. Fill out this form to get approved and a PayPal representative will reach out to you shortly. For more information about partner integrations and onboarding sellers, see PayPal Complete Payments Platform for Marketplaces and Platforms.

## Servers

- PayPal Sandbox Environment: https://api-m.sandbox.paypal.com
- PayPal Live Environment: https://api-m.paypal.com

## Operations

### Create partner referral

`POST /v2/customer/partner-referrals`

Creates a partner referral that is shared by the partner or API caller. The partner referral is used to onboard the seller, and contains the seller's personal, business, financial and operations.

Request body: referral_data

Responses:

- 201: A successful request returns the HTTP `201 Created` status code and a JSON response body that contains a [HATEOAS link](/docs/api/overview/#hateoas-links) to show the referral data and an `action_url` to which you redirect the customer in a browser to complete the signup process. The …
- 400: Request is not well-formed, syntactically incorrect, or violates schema.
- 401: The API call is not authorized.
- 403: Authorization failed due to insufficient permissions or missing scopes on the caller account.
- 422: The caller is not a business account or the account is closed or locked.
- 500: An internal server error has occurred.
- default: The default response.

### Show referral data

`GET /v2/customer/partner-referrals/{partner_referral_id}`

Shows details by ID for referral data that was shared by the partner or API caller.

Parameters:

- `partner_referral_id` (path, required): The ID of the partner-referrals data for which to show details.

Responses:

- 200: A successful request returns the HTTP `200 OK` status code and a JSON response body that shows referral data.
- 401: The API call is not authorized.
- 403: Authorization failed due to insufficient permissions or missing scopes on the caller Account.
- 500: An internal server error has occurred.
- default: The default response.

## Schemas

### 400

- `details` (array of object | object | object | object): 

### 401

- `details` (array of object): 

### 403

- `details` (array of object): 

### 422

- `details` (array of object | object | object): 

### account

Common account object to hold the account related details of the customer.

- `individual_owners` (individual_owner_list): 
- `business_entity` (business_entity): Business entity of the account.

### address_details

The non-portable additional address details that are sometimes needed for compliance, risk, or other scenarios where fine-grain address information might be needed. Not portable with common third party and open source. Redundant with core fields.
For example, `address_portable.address_line_1` is usually a combination of `address_details.street_number`, `street_name`, and `street_type`.

- `street_number` (string): The street number.
- `street_name` (string): The street name. Just `Drury` in `Drury Lane`.
- `street_type` (string): The street type. For example, avenue, boulevard, road, or expressway.
- `delivery_service` (string): The delivery service. Post office box, bag number, or post office name.
- `building_name` (string): A named locations that represents the premise. Usually a building name or number or collection of buildings with a common name or number. For example, `Craven House`.
- `sub_building` (string): The first-order entity below a named building or location that represents the sub-premise. Usually a single building within a collection of buildings with a common name. Can be a flat, story, floor, room, or apartment.

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

### bank

The bank account information.

- `nick_name` (string): The user-provided short name for the user's bank account.
- `account_number` (string, required): The bank account number.
- `account_type` (string, required): The type of bank account. Values: CHECKING, SAVINGS.
- `currency_code` (currency_code): The primary currency code of the bank account.
- `identifiers` (identifier_list): 
- `branch_location` (object): The portable international postal address. Maps to [AddressValidationMetadata](https://github.com/googlei18n/libaddressinput/wiki/AddressValidationMetadata) and HTML 5.1 [Autofilling form controls: the autocomplete attribute](https://www.w3.org/TR/html51/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute).
- `mandate` (mandate): Mandate for this bank account.

### bank_list

An array of banks attached to this managed account.

### beneficial_owners

Beneficial owners of the entity.

- `individual_beneficial_owners` (individual_beneficial_owner_list): 
- `business_beneficial_owners` (business_beneficial_owner_list): 

### billing_agreement

The details of the billing agreement between the partner and a seller.

- `description` (string): The billing agreement description.
- `billing_experience_preference` (billing_experience_preference): 
- `merchant_custom_data` (string): The custom data for the billing agreement.
- `approval_url` (string): The URL to which to redirect seller to accept the billing agreement.
- `ec_token` (string): The billing agreement token for the agreement.

### billing_experience_preference

The preference that customizes the billing experience of the customer.

- `experience_id` (string): The ID of the payment web experience profile.
- `billing_context_set` (boolean): Indicates whether the partner has already displayed the billing context to the seller.

### birth_details

Date of birth data provided by the user

- `date_of_birth` (date_no_time, required): date of birth, fomrat [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).

### business

- `business_type` (business_type_info): Information related to the business like the nature of business, started date etc.
- `business_industry` (business_industry): Information related to the business like the nature of business, started date etc.
- `business_incorporation` (object): Business incorporation information.
- `names` (business_name_detail_list): 
- `emails` (email_list): 
- `website` (string): Website of the business.
- `addresses` (business_address_detail_list): 
- `phones` (business_phone_detail_list): 
- `documents` (business_document_list): 

### business_address_detail

### business_address_detail_list

List of addresses associated with the business entity.

### business_address_type

Address type under which the provided address is tagged

Allowed values: `WORK`

### business_beneficial_owner

### business_beneficial_owner_list

Business beneficial owners.

### business_document

### business_document_list

Business Party related Document data collected from the customer.. For example SSN, ITIN, Business registration number that were collected from the user.

### business_document_type

The type of documents.

Allowed values: `SOCIAL_SECURITY_NUMBER`, `EMPLOYMENT_IDENTIFICATION_NUMBER`, `TAX_IDENTIFICATION_NUMBER`, `PASSPORT_NUMBER`, `PENSION_FUND_ID`, `MEDICAL_INSURANCE_ID`, `CNPJ`, `CPF`, `PAN`, `BUSINESS_REGISTRATION`

### business_entity

### business_industry

The category, subcategory and MCC code of the business.

- `category` (string, required): The customer's business category code. PayPal uses industry standard seller category codes.
- `mcc_code` (string, required): The customer's business seller category code. PayPal uses industry standard seller category codes.
- `subcategory` (string, required): The customer's business subcategory code. PayPal uses industry standard seller subcategory codes.

### business_name

The business name of the party.

- `business_name` (string): Required. The business name of the party.

### business_name_detail

### business_name_detail_list

Name of the business.

### business_name_type

Business name type

Allowed values: `DOING_BUSINESS_AS`, `LEGAL_NAME`

### business_phone_detail

### business_phone_detail_list

List of phone number associated with the business.

### business_phone_type

The type of phone number provided. For example, home, work, or mobile.

Allowed values: `CUSTOMER_SERVICE`, `BUSINESS`

### business_sub_type

Sub classification of the business type

Allowed values: `ASSO_TYPE_INCORPORATED`, `ASSO_TYPE_NON_INCORPORATED`, `GOVT_TYPE_ENTITY`, `GOVT_TYPE_EMANATION`, `GOVT_TYPE_ESTD_COMM`, `GOVT_TYPE_ESTD_FC`, `GOVT_TYPE_ESTD_ST_TR`

### business_type

The business types classified

Allowed values: `ANY_OTHER_BUSINESS_ENTITY`, `ASSOCIATION`, `CORPORATION`, `GENERAL_PARTNERSHIP`, `GOVERNMENT`, `INDIVIDUAL`, `LIMITED_LIABILITY_PARTNERSHIP`, `LIMITED_LIABILITY_PROPRIETORS`, `LIMITED_LIABILITY_PRIVATE_CORPORATION`, `LIMITED_PARTNERSHIP`, `LIMITED_PARTNERSHIP_PRIVATE_CORPORATION`, `NONPROFIT`, `ONLY_BUY_OR_SEND_MONEY`, `OTHER_CORPORATE_BODY`, `PARTNERSHIP`, `PRIVATE_PARTNERSHIP`, `PROPRIETORSHIP`, `PROPRIETORSHIP_CRAFTSMAN`, `PROPRIETORY_COMPANY`, `PRIVATE_CORPORATION`, `PUBLIC_COMPANY`, `PUBLIC_CORPORATION`, `PUBLIC_PARTNERSHIP`, `REGISTERED_COOPERATIVE`

### business_type_info

The type and subtype of the business.

- `type` (business_type): Type of business entity like corporation, sole prop, governmental.
- `subtype` (business_sub_type): The sub classification of the business type.

### capabilities

Optional capabilities of the selected PayPal product for which the customer is being onboarded.

Allowed values: `PAYPAL_WALLET_VAULTING_ADVANCED`, `PAY_UPON_INVOICE`, `APPLE_PAY`, `GOOGLE_PAY`

### capabilities_list

An array of capabilities which the partner wants to enable for the selected products. Supported only when products are specified.

### classic_api_integration

The integration details for PayPal CLASSIC endpoints.

### country_code

The [two-character ISO 3166-1 code](/docs/api/reference/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### country_code-2

The [two-character ISO 3166-1 code](/docs/integration/direct/rest/country-codes/) that identifies the country or region.Note: The country code for Great Britain is `GB` and not `UK` as used in the top-level domain names for that country. Use the `C2` country code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and cross-border transactions.

### country_transfer_method_currency_selection

Requested country, transfer method and currency.

- `country` (country_code): Country.
- `transfer_methods` (transfer_method_list): 

### country_transfer_method_currency_selection_list

Requested country, transfer method and currency.

### create_referral_data_response

The shared referral data.

- `links` (definitions-link_description_list): 

### currency_code

The [three-character ISO-4217 currency code](/docs/integration/direct/rest/currency-codes/) that identifies the currency.

### currency_code-2

The [three-character ISO-4217 currency code](/docs/api/reference/currency-codes/) that identifies the currency.

### currency_code_list

Requested Currencies for a Transfer Method.

### currency_range

The currency range, from the minimum inclusive amount to the maximum inclusive amount.

- `minimum_amount` (money): The minimum inclusive amount for the range.
- `maximum_amount` (money): The maximum inclusive amount for the range.

### date_no_time

The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.

### date_time

The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.Note: The regular expression provides guidance but does not reject all invalid dates.

### definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/overview/#hateoas-links).

### dependent_process

### dependent_process_list

An array of dependent processes.

### document

The document object.

- `id` (string): The encrypted identifier for the document.
- `labels` (labels_list): 
- `name` (string): The file name.
- `identification_number` (string): The number for the document. It is the ID number if the document is `ID CARD`, the passport number if the document is `PASSPORT`, etc.
- `issue_date` (date_no_time): The issue date of the document.
- `expiry_date` (date_no_time): The expire data of the document.
- `issuing_country_code` (country_code): The country code of the document.
- `files` (file_reference_list): 
- `links` (link_description_list): 

### email

An email address at which the person or business can be contacted.

- `type` (string, required): The role of the email address. Values: CUSTOMER_SERVICE.
- `email` (email_address, required): 

### email_address

The internationalized email address.Note: Up to 64 characters are allowed before and 255 characters are allowed after the `@` sign. However, the generally accepted maximum length for an email address is 254 characters. The pattern verifies that an unquoted `@` sign exists.

### email_list

Email addresses of the business.

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

### file_reference

The file reference. Can be a file in PayPal MediaServ, PayPal DMS, or another custom store.

- `id` (string): The ID of the referenced file.
- `reference_url` (string): The reference URL for the file.
- `content_type` (string): The [Internet Assigned Numbers Authority (IANA) media type of the file](https://www.iana.org/assignments/media-types/media-types.xhtml).
- `create_time` (date_time): The date and time when the file was created, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).
- `size` (string): The size of the file, in bytes.

### file_reference_list

The files contained in the document. For example, a document could be represented by a front page file and a back page file, etc.

### financial_instruments

Financial instruments attached to this account.

- `banks` (bank_list): 

### first_party_details

The integration details for PayPal first party REST endpoints.

- `features` (rest_endpoint_features_enum_list, required): 
- `seller_nonce` (string, required): S256 - The code verifier must be high-entropy cryptographic random string with a byte length of 43-128 range.

### identifier

The bank account ID. An ID with `ROUTING_NUMBER_1` is required.

- `type` (string): The bank account ID type. Values: BANK_CODE, BI_CODE, BRANCH_CODE, ROUTING_NUMBER_1, ROUTING_NUMBER_2, ROUTING_NUMBER_3, SWIFT_CODE, BRANCH_CODE, INTERMEDIARY_SWIFT_CODE, BBAN, BBAN_ENCRYPTED, BBAN_HMAC, AGGREGATOR_YODLEE.
- `value` (string): The value of account identifier.

### identifier_list

An array of instrument institute attributes. Used with the account number to uniquely identify the instrument. Value is:

- For banks with IBAN information, the IBAN number.
- For banks with BBAN information, the BBAN number.
- For banks with both IBAN and BBAN information, the IBAN number.

### individual_beneficial_owner

### individual_beneficial_owner_list

Individual beneficial owners.

### individual_owner

### individual_owner_list

List of owners in the account. There should be only one primary account owner which is mentioned in their role_type.

### individual_owner_type

Role of the person party played in the account.

Allowed values: `PRIMARY`

### integration_details

The integration details for the partner and customer relationship. Required if `operation` is `API_INTEGRATION`.

- `classic_api_integration` (classic_api_integration): 
- `rest_api_integration` (rest_api_integration): 

### labels

A document label.

### labels_list

The document labels. A document could be classfied to multiple categories. For example, a bill document can be classfified as `BILL DOCUMENT` and `UTILITY DOCUMENT`.

### language

The [language tag](https://tools.ietf.org/html/bcp47#section-2) for the language in which to localize the error-related strings, such as messages, issues, and suggested actions. The tag is made up of the [ISO 639-2 language code](https://www.loc.gov/standards/iso639-2/php/code_list.php), the optional [ISO-15924 script tag](https://www.unicode.org/iso15924/codelists.html), and the [ISO-3166 alpha-2 country code](/docs/integration/direct/rest/country-codes/).

### legal_consent

The customer-provided consent.

- `type` (string, required): The type of consent. `SHARE_DATA_CONSENT` gives consent to you to share your customer's data with PayPal. Values: SHARE_DATA_CONSENT.
- `granted` (boolean, required): Indicates whether the customer agreed to share this type of data. To give consent, specify `true`. To withhold consent, specify `false`.

### legal_consent_list

An array of all consents that the partner has received from this seller. If `SHARE_DATA_CONSENT` is not granted, PayPal does not store customer data.

### link_description

The request-related [HATEOAS link](/docs/api/reference/api-responses/#hateoas-links) information.

- `href` (string, required): The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.
- `rel` (string, required): The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- `method` (string): The HTTP method required to make the related call. Values: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, PATCH.

### link_description_list

The HATEOAS links.

### mandate

Seller’s consent to operate on this financial instrument.

- `accepted` (boolean, required): Whether mandate was accepted or not.

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
- `full_name` (string): When the party is a person, the party's full name.

### offline_onboarding_preference

The preference details for offline onboarding without UI.

### operation

The required operation to share data.

- `operation` (string, required): The operation to enable for the customer. To enable the collection of the API permissions that you require to integrate with the customer, specify `API_INTEGRATION`. `BANK_ADDITION` is supported only for the US. Values: API_INTEGRATION, BANK_ADDITION, BILLING_AGREEMENT, CONTEXTUAL_MARKETING_CONSENT, OFFLINE_ONBOARDING, SALESFORCE_REFERRAL.
- `api_integration_preference` (integration_details): 
- `offline_onboarding_preference` (offline_onboarding_preference): 
- `billing_agreement` (billing_agreement): 

### operation_list

An array of operations to perform for the customer while they share their data.

### partner_config_override

The preference to customize the web experience of the customer by overriding that is set at the Partner's Account.

- `return_url` (string): The URL to which to redirect the customer upon completion of the onboarding process.
- `return_url_description` (string): The description of the return URL.
- `show_add_credit_card` (boolean): Indicates whether to show an add credit card page.

### payout_attributes

Payout specific attributes.

- `marketplace` (boolean): If `true`, specifies that the merchant or platform is offering goods or services on behalf of 3rd party sellers.
- `kyc_required` (boolean): If `true`, specifies that the Kyc is required for the merchant.
- `country_transfer_method_currency_selection` (country_transfer_method_currency_selection_list): 

### percentage

The percentage, as a fixed-point, signed decimal number. For example, define a 19.99% interest rate as `19.99`.

### person

Details of the person or party.

- `id` (string): The encrypted party ID.
- `names` (person_name_list): 
- `citizenship` (country_code): The citizenship country code of the person.
- `addresses` (person_address_detail_list): 
- `phones` (person_phone_detail_list): 
- `birth_details` (birth_details): The person's birth details.
- `documents` (person_document_list): 

### person_address_detail

### person_address_detail_list

The list of addresses associated with the person.

### person_address_type

The address type under which the provided address is tagged.

Allowed values: `HOME`

### person_document

### person_document_list

A person's or party's related document data collected from the customer. For example SSN, ITIN, or business registration number collected from the user. Note: This field is not applicable for POST [/v2/customer/partner-referrals](/docs/api/partner-referrals/v2/#partner-referrals_create) API calls.

### person_document_type

The type of documents.

Allowed values: `SOCIAL_SECURITY_NUMBER`, `EMPLOYMENT_IDENTIFICATION_NUMBER`, `TAX_IDENTIFICATION_NUMBER`, `PASSPORT_NUMBER`, `PENSION_FUND_ID`, `MEDICAL_INSURANCE_ID`, `CNPJ`, `CPF`, `PAN`, `NATIONAL_ID_CARD`

### person_name

### person_name_list

The name of the person.

### person_name_type

The person's name type.

Allowed values: `LEGAL`

### person_phone_detail

### person_phone_detail_list

The list of phone numbers associated with the person.

### phone

The phone number in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en).

- `country_code` (string, required): The country calling code (CC), in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the CC and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `national_number` (string, required): The national number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). The combined length of the country calling code (CC) and the national number must not be greater than 15 digits. The national number consists of a national destination code (NDC) and subscriber number (SN).
- `extension_number` (string): The extension number.

### phone_type

The phone type.

Allowed values: `FAX`, `HOME`, `MOBILE`, `OTHER`, `PAGER`

### product

The PayPal product for which the customer is onboarded.

Allowed values: `ALIPAY`, `BANCONTACT`, `BLIK`, `EPS`, `PPCP`, `EXPRESS_CHECKOUT`, `PAYMENT_METHODS`, `ADVANCED_VAULTING`, `IDEAL`, `MB_WAY`, `MULTIBANCO`, `PAYPAL_COMMERCE_PLATFORM_BUSINESS`, `PPPLUS`, `PRZELEWY24`, `SATISPAY`, `TRUSTLY`, `WECHAT_PAY`, `WEBSITE_PAYMENT_PRO`, `ZETTLE`, `PAYPAL_COMMERCE_PLATFORM_BUSINESS`, `HYPERWALLET_PAYOUTS`

### product_list

An array of PayPal products to which the partner wants to onboard the customer.

### purpose_code_enum

The purpose code. Required only for India. For more information, see the Reserve Bank Of India web site. Value is:

- `P0104`. Cross border delivery of goods and services.
- `P0301`. Business related travel purchase.
- `P0801`. Hardware consulting.
- `P0802`. Software consulting.
- `P0803`. Data processing consulting.
- `P0805`. Freelance journalism.
- `P0806`. Other information services.
- `P0902`. Licensing revenues.
- `P1004`. Legal.
- `P1005`. Accounting and tax.
- `P1006`. Business and management consultancy.
- `P1007`. Advertising and market research.
- `P1008`. Research and development.
- `P1009`. Architectural services.

Allowed values: `P0104`, `P0301`, `P0801`, `P0802`, `P0803`, `P0805`, `P0806`, `P0902`, `P1004`, `P1005`, `P1006`, `P1007`, `P1008`, `P1009`

### referral_data

The customer's referral data that partners share with PayPal.

### referral_data_response

The share referral data response.

- `partner_referral_id` (string): The ID to access the customer's data shared by the partner with PayPal.
- `submitter_payer_id` (string): The payer ID of the partner who shared the referral data.
- `submitter_client_id` (string): The client ID of the partner who shared the referral data. This cliend ID will be returned only when the caller is determined as an internal partner, which means the scope of the caller's security context only have "https://uri.paypal.com/services/customer/partner-referrals", For more information, see Api Actor type in Typhoon service.
- `referral_data` (referral_data): 
- `links` (referral_data_response_definitions-link_description_list): 

### referral_data_response_definitions-link_description_list

An array of request-related [HATEOAS links](/docs/api/overview/#hateoas-links).

### rest_api_integration

The integration details for PayPal REST endpoints.

- `integration_method` (string): The REST-credential integration method. Values: BRAINTREE, PAYPAL, SDK.
- `integration_type` (string, required): The type of REST-endpoint integration. To integrate with Braintree v.zero for PayPal REST endpoints, specify `third_party_details`. Values: FIRST_PARTY, THIRD_PARTY.
- `first_party_details` (first_party_details): 
- `third_party_details` (third_party_details): 

### rest_api_integration_rest_endpoint_features_enum_list

An array of features that partner can access, or use, in PayPal on behalf of the seller. The seller grants permission for these features to the partner.

### rest_endpoint_features_enum

The REST endpoint.

Allowed values: `PAYOUTS`, `PAYMENT`, `REFUND`, `FUTURE_PAYMENT`, `DIRECT_PAYMENT`, `PARTNER_FEE`, `DELAY_FUNDS_DISBURSEMENT`, `READ_SELLER_DISPUTE`, `UPDATE_SELLER_DISPUTE`, `ADVANCED_TRANSACTIONS_SEARCH`, `SWEEP_FUNDS_EXTERNAL_SINK`, `ACCESS_MERCHANT_INFORMATION`, `TRACKING_SHIPMENT_READWRITE`, `INVOICE_READ_WRITE`, `DISPUTE_READ_BUYER`, `UPDATE_CUSTOMER_DISPUTES`, `VAULT`, `BILLING_AGREEMENT`, `WITHDRAWALS`, `LINKED_FINANCIAL_INSTRUMENTS`, `USER_PROFILE`, `TRANSACTION_RISK_DATA`, `PAYPAL_BALANCE`, `EXCHANGE_CURRENCY`

### rest_endpoint_features_enum_list

An array of features that partner can access, or use, in PayPal on behalf of the seller. The seller grants permission for these features to the partner.

### signup_mode

Signup Mode to be used for sellers for third party integration.

Allowed values: `VERIFY_WITH_PAYPAL`

### third_party_details

The integration details for PayPal REST endpoints.

- `features` (rest_api_integration_rest_endpoint_features_enum_list): 
- `signup_mode` (signup_mode): 
- `organization` (string): The organization to which the account will belong in the partner’s hierarchy, as a path.

### transfer_method

Requested transfer method and currency for a country.

- `transfer_method_type` (string): Transfer Method type. Values: BANK_ACCOUNT, PAYPAL, VENMO, WIRE_ACCOUNT.
- `currencies` (currency_code_list): 

### transfer_method_list

Requested transfer method and currency for a country.

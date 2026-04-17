# Backbase TPP API Simulator

API simulator for UK & Berlin Group Open Banking AIS (Account Information Services), PIS (Payment Initiation Services), and CBPII (Confirmation of Funds) consent flows with SaltEdge.

## Table of Contents

- [Setup](#setup)
- [Docker](#docker)
- [API Endpoints](#api-endpoints)
  - [Common Endpoints](#common-endpoints)
    - [Health Check](#health-check)
    - [API Documentation](#api-documentation)
  - [UK Endpoints](#uk-endpoints)
    - [AIS (UK)](#ais-uk)
      - [Create AIS Consent](#create-ais-consent-uk)
      - [Get AIS Consent Details](#get-ais-consent-details-uk)
      - [Revoke AIS Consent](#revoke-ais-consent-uk)
    - [PIS (UK)](#pis-uk)
      - [Create PIS Consent](#create-pis-consent-uk)
      - [Get PIS Consent Details](#get-pis-consent-details-uk)
    - [CBPII/COF (UK)](#cbpiicof-uk)
      - [Create CBPII Consent](#create-cbpii-consent-uk)
      - [Get CBPII Consent Details](#get-cbpii-consent-details-uk)
      - [Revoke CBPII Consent](#revoke-cbpii-consent-uk)
  - [BG Endpoints](#bg-endpoints)
    - [AIS (BG)](#ais-bg)
      - [Create AIS Consent](#create-ais-consent-bg)
      - [Show AIS Consent](#show-ais-consent-bg)
      - [Status AIS Consent](#status-ais-consent-bg)
      - [Destroy AIS Consent](#destroy-ais-consent-bg)
      - [Accounts List](#accounts-list-bg)
      - [Single Account](#single-account-bg)
      - [Transactions List](#transactions-list-bg)
      - [Account Balance](#account-balance-bg)
    - [PIS (BG)](#pis-bg)
      - [Create Single Payment](#create-single-payment-bg)
      - [Create Periodic Payment](#create-periodic-payment-bg)
      - [Show Payment](#show-payment-bg)
      - [Payment Status](#payment-status-bg)
      - [Payment Authorisation](#payment-authorisation-bg)
      - [Revoke Payment](#revoke-payment-bg)
      - [Cancellation Authorisations](#cancellation-authorisations-bg)
      - [Cancellation Authorisation](#cancellation-authorisation-bg)
    - [CBPII/COF (BG)](#cbpiicof-bg)
      - [Consent Create](#consent-create-bg-funds)
      - [Consents Show](#consents-show-bg-funds)
      - [Consents Status](#consents-status-bg-funds)
      - [Consent Destroy](#consent-destroy-bg-funds)
      - [Consent Authorisation](#consent-authorisation-bg-funds)
      - [Confirmations](#confirmations-bg-funds)
- [UK Default Consent Objects (Empty Request Body)](#uk-default-consent-objects-empty-request-body)
- [BG Default Consent Object (Empty Request Body)](#bg-default-consent-object-empty-request-body)
- [Configuration (.env)](#configuration-env)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp env.example .env
# Edit .env: set both UK and BG values as needed

# 3. Add key/certificate files (if you use file paths instead of inline PEM env vars)
# UK key (for UK endpoints):
cp /path/to/uk_client_private.key ./client_private.key
# BG cert + key (for BG endpoints):
cp /path/to/bg_client_signed_certifcate.crt ./client_signed_certifcate.crt
cp /path/to/bg_client_private.key ./bg_client_private.key

# 4. Start
npm start
```

Server runs on **http://localhost:8080**

## Docker

### Build Docker Image

```bash
docker build -t bb-tpp-api-simulator:latest .
```

### Run Docker Container (Local Testing)

All configuration is provided via environment variables:

```bash
docker run -d \
  -p 8080:8080 \
  -e OB_SOFTWARE_ID=your-software-id \
  -e OB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----" \
  -e OB_PROVIDER_CODE=backbase_dev_uk \
  -e BG_PROVIDER_CODE=backbase_dev_eu \
  -e BG_REDIRECT_URI=https://backbase-dev.com/callback \
  -e BG_CERT_PEM="-----BEGIN CERTIFICATE-----\nYOUR_BG_CERT\n-----END CERTIFICATE-----" \
  -e BG_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_BG_KEY\n-----END PRIVATE KEY-----" \
  -e PRIORA_URL=priora.saltedge.com \
  -e PROTOCOL=https \
  -e REDIRECT_URI=https://backbase-dev.com/callback \
  -e PORT=8080 \
  --name bb-tpp-simulator \
  bb-tpp-api-simulator:latest
```

**Note:** The `OB_PRIVATE_KEY` environment variable supports Azure Key Vault format (single-line with spaces) and will be automatically converted to proper PEM format.
The same inline PEM approach also works for BG using `BG_CERT_PEM` and `BG_PRIVATE_KEY`.

## API Endpoints

**Base URL Placeholder:** `{BASE_URL}`
- **Local:** `http://localhost:8080`

**UK API version:** UK AIS, PIS and CBPII consent API calls in this simulator target Open Banking `v3.1.11`.

**Salt Edge API specs used by this simulator:**
- UK (Open Banking v3.1.11): [https://priora.saltedge.com/docs/open_banking/backbase_prod_uk/v3.1.11](https://priora.saltedge.com/docs/open_banking/backbase_prod_uk/v3.1.11)
- BG (Berlin Group): [https://priora.saltedge.com/docs/berlingroup/backbase_sandbox_eu](https://priora.saltedge.com/docs/berlingroup/backbase_sandbox_eu)

Replace `{BASE_URL}` with the appropriate URL in all examples below.

---

### Common Endpoints

#### Health Check
Check if the service is running.

```bash
curl {BASE_URL}/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-06T08:49:11.608Z",
  "version": "1.0.0",
  "service": "bb-tpp-api-simulator"
}
```

---

#### API Documentation
Get list of all available endpoints.

```bash
curl {BASE_URL}/
```

---

### UK Endpoints

#### AIS (UK)

##### Create AIS Consent (UK)
Create an Account Information Services consent and get the authorization URL.

```bash
curl -X POST {BASE_URL}/api/uk/ais/consent \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Request Body (all fields optional):**
| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |
| `redirectUri` | string | OAuth callback URL | Value from env `REDIRECT_URI` |
| `permissions` | array | List of AIS permissions | 7 default account/transaction permissions |
| `expirationDateTime` | string \| null | ISO 8601 date when consent expires | See below |

**`expirationDateTime` behavior:**
- **Not provided** (omit from request): simulator sends `now + 30 days` to Salt Edge.
- **`null`**: simulator **omits** the field entirely from the upstream payload (field not sent to Salt Edge).
- **String** (e.g. `"2025-12-31T23:59:59Z"`): simulator forwards the value to Salt Edge.

To create a consent without any expiration date sent to Salt Edge, pass `"expirationDateTime": null` in your request body.

**Note:** For UK AIS `v3.1.11`, Salt Edge requires a `Risk` object in the upstream consent payload.  
The simulator automatically sends `Risk: {}` when creating AIS consents.

**Example with custom parameters:**
```bash
curl -X POST {BASE_URL}/api/uk/ais/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_uk",
    "redirectUri": "https://your-app.com/callback",
    "permissions": ["ReadAccountsBasic", "ReadBalances", "ReadTransactionsBasic"],
    "expirationDateTime": "2025-12-31T23:59:59Z"
  }'
```

**Example to omit ExpirationDateTime from upstream (no expiration sent to Salt Edge):**
```bash
curl -X POST {BASE_URL}/api/uk/ais/consent \
  -H "Content-Type: application/json" \
  -d '{"expirationDateTime": null}'
```

**Response:**
```json
{
  "consentId": "urn-backbase_dev_uk-intent-12345",
  "authorizationUrl": "https://business-universal.dev.oblm.azure.backbaseservices.com/...",
  "status": "Pending"
}
```

➡️ Open `authorizationUrl` in a browser to authorize the consent.

---

##### Get AIS Consent Details (UK)
Retrieve details of an existing AIS consent by ID.

```bash
curl "{BASE_URL}/api/uk/ais/consent/{CONSENT_ID}"
```

**Path Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `consentId` | string | The consent ID returned from create consent | Yes |

**Query Parameters (optional):**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |

**Example:**
```bash
curl "{BASE_URL}/api/uk/ais/consent/urn-backbase_dev_uk-intent-12345?providerCode=backbase_dev_uk"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Data": {
      "ConsentId": "urn-backbase_dev_uk-intent-12345",
      "Status": "AwaitingAuthorisation",
      "Permissions": ["ReadAccountsBasic", "ReadBalances", ...],
      "ExpirationDateTime": "2025-12-06T08:49:11Z"
    }
  }
}
```

---

##### Revoke AIS Consent (UK)
Revoke/Delete an existing AIS consent by ID. This permanently removes the consent and prevents further use.

```bash
curl -X DELETE "{BASE_URL}/api/uk/ais/consent/{CONSENT_ID}"
```

**Path Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `consentId` | string | The consent ID to revoke | Yes |

**Query Parameters (optional):**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |

**Example:**
```bash
curl -X DELETE "{BASE_URL}/api/uk/ais/consent/urn-backbase_dev_uk-intent-12345?providerCode=backbase_dev_uk"
```

**Response:**
```json
{
  "success": true,
  "message": "Consent revoked successfully",
  "consentId": "urn-backbase_dev_uk-intent-12345"
}
```

---

#### PIS (UK)

##### Create PIS Consent (UK)
Create a Payment Initiation Services consent and get the authorization URL.

```bash
curl -X POST {BASE_URL}/api/uk/pis/consent \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Request Body (all fields optional):**
| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |
| `redirectUri` | string | OAuth callback URL | Value from env `REDIRECT_URI` |
| `paymentProduct` | string | Payment product type | `domestic-payment-consents` |
| `initiation` | object | Payment initiation data | Default UK FPS payment structure |
| `authorisation` | object | Authorisation data (not used for scheduled payments) | Not sent unless provided |
| `scaSupportData` | object | SCA support data | Not sent unless provided |
| `risk` | object | Risk data | Not sent unless provided |
| `permission` | string | Permission for scheduled payments | `Create` (auto-set for scheduled) |

**Default Payment Initiation Structure:**
The default `initiation` includes:
- `LocalInstrument`: `UK.OBIE.FPS`
- `InstructedAmount`: `20.00 GBP`
- `DebtorAccount`: UK sort code account format
- `CreditorAccount`: UK sort code account format
- Remittance information

**Example: Immediate Domestic Payment**
```bash
curl -X POST {BASE_URL}/api/uk/pis/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_uk",
    "redirectUri": "https://your-app.com/callback",
    "paymentProduct": "domestic-payment-consents",
    "initiation": {
      "InstructionIdentification": "PAY001",
      "EndToEndIdentification": "E2E-12345",
      "LocalInstrument": "UK.OBIE.FPS",
      "InstructedAmount": {
        "Amount": "100.00",
        "Currency": "GBP"
      },
      "DebtorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "11280001234567",
        "Name": "John Doe"
      },
      "CreditorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "08080021325698",
        "Name": "Jane Smith"
      }
    }
  }'
```

**Example: Scheduled Domestic Payment**
```bash
curl -X POST {BASE_URL}/api/uk/pis/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_uk",
    "redirectUri": "https://your-app.com/callback",
    "paymentProduct": "domestic-scheduled-payment-consents",
    "initiation": {
      "InstructionIdentification": "SCHD001",
      "EndToEndIdentification": "SCHEDULED-12345",
      "LocalInstrument": "UK.OBIE.FPS",
      "RequestedExecutionDateTime": "2026-02-15T09:00:00+00:00",
      "InstructedAmount": {
        "Amount": "100.00",
        "Currency": "GBP"
      },
      "DebtorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "11280001234567",
        "Name": "John Doe"
      },
      "CreditorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "08080021325698",
        "Name": "Jane Smith"
      },
      "RemittanceInformation": {
        "Reference": "Monthly payment",
        "Unstructured": "Scheduled transfer"
      }
    }
  }'
```

**Note:** For scheduled payments:
- `RequestedExecutionDateTime` is **required** in the initiation (future date/time)
- `permission` defaults to `"Create"` automatically
- Do NOT include `authorisation` in the request body

**Example: Domestic Standing Order**
```bash
curl -X POST {BASE_URL}/api/uk/pis/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_uk",
    "redirectUri": "https://your-app.com/callback",
    "paymentProduct": "domestic-standing-order-consents",
    "permission": "Create",
    "initiation": {
      "Frequency": "EvryDay",
      "Reference": "Monthly rent payment",
      "FirstPaymentDateTime": "2026-02-01T09:00:00+00:00",
      "FirstPaymentAmount": {
        "Amount": "500.00",
        "Currency": "GBP"
      },
      "RecurringPaymentAmount": {
        "Amount": "500.00",
        "Currency": "GBP"
      },
      "FinalPaymentDateTime": "2027-01-31T09:00:00+00:00",
      "FinalPaymentAmount": {
        "Amount": "500.00",
        "Currency": "GBP"
      },
      "DebtorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "11280001234567",
        "Name": "John Doe"
      },
      "CreditorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "08080021325698",
        "Name": "Landlord Ltd"
      }
    }
  }'
```

**Note:** For standing orders:
- `paymentProduct` must be `"domestic-standing-order-consents"`
- `Frequency` is required (e.g., `EvryDay`, `EvryWorkgDay`, `IntrvlWkDay:01:03` for every 3rd day)
- `FirstPaymentDateTime`, `RecurringPaymentAmount` are required
- `FinalPaymentDateTime` and `FinalPaymentAmount` are optional (omit for indefinite standing order)
- `permission` field is automatically set to `"Create"`

**Response:**
```json
{
  "consentId": "urn-backbase_dev_uk-intent-12345",
  "authorizationUrl": "https://business-universal.dev.oblm.azure.backbaseservices.com/...",
  "status": "AwaitingAuthorisation"
}
```

➡️ Open `authorizationUrl` in a browser to authorize the payment consent.

---

##### Get PIS Consent Details (UK)
Retrieve details of an existing PIS consent by ID.

```bash
curl "{BASE_URL}/api/uk/pis/consent/{CONSENT_ID}"
```

**Path Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `consentId` | string | The consent ID returned from create consent | Yes |

**Query Parameters (optional):**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |
| `paymentProduct` | string | Payment product type | `domestic-payment-consents` |

**Example:**
```bash
curl "{BASE_URL}/api/uk/pis/consent/urn-backbase_dev_uk-intent-12345?providerCode=backbase_dev_uk&paymentProduct=domestic-payment-consents"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Data": {
      "ConsentId": "urn-backbase_dev_uk-intent-12345",
      "Status": "AwaitingAuthorisation",
      "Initiation": {
        "InstructionIdentification": "ANSM023",
        "EndToEndIdentification": "FRESCO.21302.GFX.37",
        "LocalInstrument": "UK.OBIE.FPS",
        "InstructedAmount": {
          "Amount": "20.00",
          "Currency": "GBP"
        },
        ...
      },
      "Risk": {
        "PaymentContextCode": "EcommerceGoods",
        ...
      }
    }
  }
}
```

---

#### CBPII/COF (UK)

##### Create CBPII Consent (UK)
Create a Confirmation of Funds (CBPII) consent and get the authorization URL.

```bash
curl -X POST {BASE_URL}/api/uk/cbpii/consent \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Request Body (all fields optional):**
| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |
| `redirectUri` | string | OAuth callback URL | Value from env `REDIRECT_URI` |
| `expirationDateTime` | string | ISO 8601 date when consent expires | 30 days from now |
| `debtorAccount` | object | Debtor account data used for CBPII consent | Default UK SortCodeAccountNumber account |

**Example with custom parameters:**
```bash
curl -X POST {BASE_URL}/api/uk/cbpii/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_uk",
    "redirectUri": "https://your-app.com/callback",
    "debtorAccount": {
      "SchemeName": "UK.OBIE.SortCodeAccountNumber",
      "Identification": "60304560543816",
      "Name": "Ricardos Current Account"
    }
  }'
```

**Response:**
```json
{
  "consentId": "urn-backbase_dev_uk-intent-12345",
  "authorizationUrl": "https://business-universal.dev.oblm.azure.backbaseservices.com/...",
  "status": "Pending"
}
```

➡️ Open `authorizationUrl` in a browser to authorize the CBPII consent.

---

##### Get CBPII Consent Details (UK)
Retrieve details of an existing CBPII consent by ID.

```bash
curl "{BASE_URL}/api/uk/cbpii/consent/{CONSENT_ID}"
```

**Path Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `consentId` | string | The consent ID returned from create consent | Yes |

**Query Parameters (optional):**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |

**Example:**
```bash
curl "{BASE_URL}/api/uk/cbpii/consent/urn-backbase_dev_uk-intent-12345?providerCode=backbase_dev_uk"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Data": {
      "ConsentId": "urn-backbase_dev_uk-intent-12345",
      "Status": "AwaitingAuthorisation"
    }
  }
}
```

---

##### Revoke CBPII Consent (UK)
Revoke/Delete an existing CBPII consent by ID. This calls SaltEdge to delete the funds-confirmation-consent.

```bash
curl -X DELETE "{BASE_URL}/api/uk/cbpii/consent/{CONSENT_ID}"
```

**Path Parameters:**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `consentId` | string | The consent ID to revoke | Yes |

**Query Parameters (optional):**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `providerCode` | string | Open Banking provider code | `backbase_dev_uk` (from env) |

**Example:**
```bash
curl -X DELETE "{BASE_URL}/api/uk/cbpii/consent/urn-backbase_dev_uk-intent-12345?providerCode=backbase_dev_uk"
```

**Response:** `204 No Content`

---

### BG Endpoints

Berlin Group endpoints are available at:
- AIS: `/api/bg/ais/*`
- PIS: `/api/bg/pis/*`
- Funds (CBPII/COF): `/api/bg/funds/*`

Required headers sent upstream for all BG AIS consent calls:
- `X-Request-ID`
- `Digest`
- `Date`
- `TPP-Signature-Certificate`
- `Signature`

For `Create`, the simulator also sends:
- `Content-Type: application/json`
- `TPP-Redirect-Preferred` (required by BG Create)
- `TPP-Redirect-URI` (set from BG redirect URI)

For BG account-data endpoints, the simulator also sends:
- `Content-Type: application/json`
- `Consent-Id` (required by Salt Edge for account-data reads)
- `PSU-Device-ID` (optional passthrough)
- `Psu-IP-Address` (optional passthrough)
- `PSU-Device-Name` (optional passthrough)

#### AIS (BG)

##### Create AIS Consent (BG)
Create a Berlin Group AIS consent. After create succeeds, the simulator calls BG `show` internally and returns `_links.scaRedirect.href` as `authorizationUrl`.

```bash
curl -X POST {BASE_URL}/api/bg/ais/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_eu",
    "recurringIndicator": true,
    "frequencyPerDay": 4,
    "validUntil": "2026-06-30",
    "access": {
      "balances": [],
      "transactions": []
    }
  }'
```

Required request body fields (BG Create):
- `recurringIndicator`
- `frequencyPerDay`
- `validUntil`
- `access`

Default values when request body is `{}`:
- `providerCode`: `backbase_dev_eu` (or `BG_PROVIDER_CODE` from env)
- `redirectUri`: `https://backbase-dev.com/callback` (or `BG_REDIRECT_URI` / `REDIRECT_URI`)
- `recurringIndicator`: `true` (hardcoded default)
- `frequencyPerDay`: `4` (hardcoded default)
- `validUntil`: `now + 90 days` (hardcoded default)
- `access`: `{ "balances": [], "transactions": [] }`
- `redirectPreferred`: `false` (hardcoded default)

**Response:**
```json
{
  "consentId": "372252",
  "consentStatus": "accepted",
  "_links": {
    "status": { "href": "/backbase_dev_eu/api/berlingroup/v1/consents/372252/status" },
    "scaStatus": { "href": "/backbase_dev_eu/api/berlingroup/v1/consents/372252/authorisations/548825" }
  },
  "authorizationUrl": "https://.../sca-redirect"
}
```

##### Show AIS Consent (BG)
Read consent content by consent ID.

```bash
curl "{BASE_URL}/api/bg/ais/consent/{CONSENT_ID}?providerCode=backbase_dev_eu"
```

##### Status AIS Consent (BG)
Read consent status by consent ID.

```bash
curl "{BASE_URL}/api/bg/ais/consent/{CONSENT_ID}/status?providerCode=backbase_dev_eu"
```

##### Destroy AIS Consent (BG)
Delete consent by consent ID.

```bash
curl -X DELETE "{BASE_URL}/api/bg/ais/consent/{CONSENT_ID}?providerCode=backbase_dev_eu"
```

##### Accounts List (BG)
List accessible accounts for the consent.

```bash
curl "{BASE_URL}/api/bg/ais/accounts?providerCode=backbase_dev_eu&consentId={CONSENT_ID}" \
  -H "PSU-Device-ID: psu-device-123" \
  -H "Psu-IP-Address: 203.0.113.10" \
  -H "PSU-Device-Name: iPhone-15"
```

Query parameters:
- `providerCode` (optional, default `backbase_dev_eu`)
- `consentId` (required unless provided as `Consent-Id` header)
- `withBalance` is intentionally ignored for this endpoint (Postman includes it, Salt Edge BG does not support it here).

##### Single Account (BG)
Read details for a single account by account ID.

```bash
curl "{BASE_URL}/api/bg/ais/accounts/{ACCOUNT_ID}?providerCode=backbase_dev_eu&consentId={CONSENT_ID}&withBalance=true"
```

Query parameters:
- `providerCode` (optional, default `backbase_dev_eu`)
- `consentId` (required unless provided as `Consent-Id` header)
- `withBalance` (optional passthrough)

##### Transactions List (BG)
Read transactions for one account.

```bash
curl "{BASE_URL}/api/bg/ais/accounts/{ACCOUNT_ID}/transactions?providerCode=backbase_dev_eu&consentId={CONSENT_ID}&bookingStatus=both"
```

Query parameters:
- `providerCode` (optional, default `backbase_dev_eu`)
- `consentId` (required unless provided as `Consent-Id` header)
- `bookingStatus` (optional passthrough, for example `both`)

##### Account Balance (BG)
Read balances for one account.

```bash
curl "{BASE_URL}/api/bg/ais/accounts/{ACCOUNT_ID}/balances?providerCode=backbase_dev_eu&consentId={CONSENT_ID}"
```

Query parameters:
- `providerCode` (optional, default `backbase_dev_eu`)
- `consentId` (required unless provided as `Consent-Id` header)

#### PIS (BG)

Berlin Group PIS endpoints are available at `/api/bg/pis/*` and cover both **single payments** (`/payments/`) and **periodic payments** (`/periodic-payments/`).

**Supported payment products** (pass as the `:paymentProduct` path parameter):
- `cross-border-credit-transfers`
- `sepa-credit-transfers`
- `instant-sepa-credit-transfers`
- `internal-transfer`

Use one of the products above in the examples below:

```bash
PAYMENT_PRODUCT=sepa-credit-transfers
# or: instant-sepa-credit-transfers
# or: cross-border-credit-transfers
# or: internal-transfer
```

##### Create Single Payment (BG)

Create a single payment. The simulator forwards the payment body to SaltEdge, then polls the Show endpoint to resolve `authorizationUrl` (same pattern as AIS/COF).

```bash
curl -X POST {BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT} \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndIdentification": "E2E-12345",
    "instructedAmount": { "amount": "1.00", "currency": "EUR" },
    "creditorName": "Test Creditor",
    "creditorAccount": { "iban": "NL62TRIO0417164106" },
    "debtorAccount": { "iban": "NL62TRIO0417164106" },
    "remittanceInformationUnstructured": "Test payment"
  }'
```

Additional single-payment examples by product:

```bash
# Instant SEPA
curl -X POST {BASE_URL}/api/bg/pis/payments/instant-sepa-credit-transfers \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndIdentification": "INSTANT-001",
    "instructedAmount": { "amount": "3.50", "currency": "EUR" },
    "creditorName": "Instant Creditor",
    "creditorAccount": { "iban": "NL62TRIO0417164106" },
    "debtorAccount": { "iban": "NL62TRIO0417164106" },
    "remittanceInformationUnstructured": "Instant test payment"
  }'

# Cross-border credit transfer (include product-specific fields)
curl -X POST {BASE_URL}/api/bg/pis/payments/cross-border-credit-transfers \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndIdentification": "CB-001",
    "instructedAmount": { "amount": "150.00", "currency": "EUR" },
    "creditorName": "Cross Border Creditor",
    "creditorAccount": { "iban": "DE89370400440532013000" },
    "creditorAgent": { "bicfi": "DEUTDEFF" },
    "chargeBearer": "SLEV",
    "instructionPriority": "NORM",
    "remittanceInformationUnstructured": "Cross-border test payment"
  }'

# Internal transfer (creditorAccount can be bban/accountNumber)
curl -X POST {BASE_URL}/api/bg/pis/payments/internal-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndIdentification": "INT-001",
    "instructedAmount": { "amount": "25.00", "currency": "EUR" },
    "creditorName": "Internal Beneficiary",
    "creditorAccount": { "accountNumber": "1234567890" },
    "debtorAccount": { "iban": "NL62TRIO0417164106" },
    "remittanceInformationUnstructured": "Internal transfer test"
  }'
```

The entire request body (minus `providerCode`, `redirectUri`, `redirectPreferred`) is passed through as the upstream SaltEdge payment payload. This means:
- For **cross-border** payments, include `creditorAgent`, `chargeBearer`, `instructionPriority`, etc.
- For **internal transfers**, `creditorAccount` may use `bban` or `accountNumber` instead of `iban`.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `providerCode` | string | BG provider code | `backbase_dev_eu` (from env) |
| `redirectUri` | string | Redirect callback URL | From env `BG_REDIRECT_URI` |
| `redirectPreferred` | boolean | TPP redirect preference | `false` |
| *(all other fields)* | — | Forwarded as-is to SaltEdge | — |

**Response (201):**
```json
{
  "paymentId": 179169,
  "transactionStatus": "PDNG",
  "_links": {
    "self": { "href": "..." },
    "status": { "href": "..." },
    "scaStatus": { "href": "..." }
  },
  "authorizationUrl": "https://business-universal.dev2.oblm.azure.backbaseservices.com/..."
}
```

##### Create Periodic Payment (BG)

Create a periodic (standing-order) payment. Same authorizationUrl resolution as single payments.

```bash
curl -X POST {BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT} \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndIdentification": "PERIODIC-001",
    "instructedAmount": { "amount": "10.00", "currency": "EUR" },
    "creditorName": "Test Creditor",
    "creditorAccount": { "iban": "NL62TRIO0417164106" },
    "debtorAccount": { "iban": "NL62TRIO0417164106" },
    "creditorAddress": { "country": "NL" },
    "startDate": "2026-05-01",
    "endDate": "2026-12-01",
    "frequency": "Monthly",
    "dayOfExecution": "1",
    "executionRule": "following"
  }'
```

Periodic-specific fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Yes | First execution date (YYYY-MM-DD) |
| `endDate` | string | No | Last execution date (omit for infinite standing order) |
| `frequency` | string | Yes | `Daily`, `Weekly`, `EveryTwoWeeks`, `Monthly`, `EveryTwoMonths`, `Quarterly`, `SemiAnnual`, `Annual` |
| `dayOfExecution` | string | No | Day of month (1-31, `31` = ultimo) |
| `executionRule` | string | No | `following` or `preceding` (weekend/holiday behavior) |

**Response (201):**
```json
{
  "periodicPaymentId": 179170,
  "transactionStatus": "PDNG",
  "_links": { "..." },
  "authorizationUrl": "https://..."
}
```

##### Show Payment (BG)

Retrieve payment details by ID. Works for both single and periodic payments.

```bash
# Single payment
curl "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}?providerCode=backbase_dev_eu"

# Periodic payment
curl "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}?providerCode=backbase_dev_eu"
```

##### Payment Status (BG)

Get the transaction status of a payment. Works for both single and periodic payments.

```bash
# Single payment
curl "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/status?providerCode=backbase_dev_eu"

# Periodic payment
curl "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/status?providerCode=backbase_dev_eu"
```

##### Payment Authorisation (BG)

Get the SCA status of a payment authorisation. Works for both single and periodic payments.

```bash
# Single payment
curl "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/authorisations/{AUTHORISATION_ID}?providerCode=backbase_dev_eu"

# Periodic payment
curl "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/authorisations/{AUTHORISATION_ID}?providerCode=backbase_dev_eu"
```

##### Revoke Payment (BG)

Cancel/revoke a payment. Works for both single and periodic payments. Only future-dated single payments and periodic payments can be revoked.

```bash
# Single payment
curl -X DELETE "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}?providerCode=backbase_dev_eu"

# Periodic payment
curl -X DELETE "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}?providerCode=backbase_dev_eu"
```

The upstream SaltEdge status code is returned as-is.

##### Cancellation Authorisations (BG)

List cancellation authorisation IDs for a revoked payment. Works for both single and periodic payments.

```bash
# Single payment
curl "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/cancellation-authorisations?providerCode=backbase_dev_eu"

# Periodic payment
curl "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/cancellation-authorisations?providerCode=backbase_dev_eu"
```

##### Cancellation Authorisation (BG)

Get the SCA status of a specific cancellation authorisation. Works for both single and periodic payments.

```bash
# Single payment
curl "{BASE_URL}/api/bg/pis/payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/cancellation-authorisations/{AUTHORISATION_ID}?providerCode=backbase_dev_eu"

# Periodic payment
curl "{BASE_URL}/api/bg/pis/periodic-payments/{PAYMENT_PRODUCT}/{PAYMENT_ID}/cancellation-authorisations/{AUTHORISATION_ID}?providerCode=backbase_dev_eu"
```

---

#### CBPII/COF (BG)
Berlin Group Funds endpoints (CBPII/COF-style) are available at `/api/bg/funds/*`.

Required signed headers sent upstream for all Funds calls:
- `X-Request-ID`
- `Digest`
- `Date`
- `TPP-Signature-Certificate`
- `Signature`

##### Consent Create (BG Funds)
Create a confirmation-of-funds consent.

```bash
curl -X POST {BASE_URL}/api/bg/funds/consent \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_eu",
    "account": {
      "iban": "XF88148405667533"
    },
    "redirectPreferred": false
  }'
```

Defaults when request body is `{}`:
- `providerCode`: `backbase_dev_eu` (or `BG_PROVIDER_CODE` from env)
- `redirectUri`: `https://backbase-dev.com/callback` (or `BG_REDIRECT_URI` / `REDIRECT_URI`)
- `redirectPreferred`: `false`
- `account`: `{ "iban": "XF88148405667533" }`

##### Consents Show (BG Funds)
Show confirmation-of-funds consent by ID.

```bash
curl "{BASE_URL}/api/bg/funds/consent/{CONSENT_ID}?providerCode=backbase_dev_eu"
```

##### Consents Status (BG Funds)
Get confirmation-of-funds consent status by ID.

```bash
curl "{BASE_URL}/api/bg/funds/consent/{CONSENT_ID}/status?providerCode=backbase_dev_eu"
```

##### Consent Destroy (BG Funds)
Delete confirmation-of-funds consent by ID.

```bash
curl -X DELETE "{BASE_URL}/api/bg/funds/consent/{CONSENT_ID}?providerCode=backbase_dev_eu"
```

##### Consent Authorisation (BG Funds)
Get confirmation-of-funds consent authorisation details.

```bash
curl "{BASE_URL}/api/bg/funds/consent/{CONSENT_ID}/authorisations/{AUTHORISATION_ID}?providerCode=backbase_dev_eu"
```

##### Confirmations (BG Funds)
Create a funds confirmation result for an existing consent.
On success, this endpoint returns HTTP `200`.

```bash
curl -X POST {BASE_URL}/api/bg/funds/confirmations \
  -H "Content-Type: application/json" \
  -d '{
    "providerCode": "backbase_dev_eu",
    "consentId": "{CONSENT_ID}",
    "account": {
      "iban": "XF42663005510913"
    },
    "instructedAmount": {
      "currency": "EUR",
      "amount": "100"
    }
  }'
```

Defaults:
- `providerCode`: `backbase_dev_eu` (or `BG_PROVIDER_CODE` from env)
- `redirectPreferred`: `false`
- `account`: `{ "iban": "XF42663005510913" }`
- `instructedAmount`: `{ "currency": "EUR", "amount": "100" }`

`consentId` is required and can be provided in:
- request body (`consentId`)
- query param (`consentId`)
- header (`Consent-Id`)

---

## UK Default Consent Objects (Empty Request Body)

When caller sends `{}`, the simulator applies these defaults before calling Salt Edge.

Common request defaults (applies to all three):
- `providerCode`: `backbase_dev_uk` (or `OB_PROVIDER_CODE` from env)
- `redirectUri`: `https://backbase-dev.com/callback` (or `REDIRECT_URI` from env)

### AIS default payload sent upstream (`POST /api/uk/ais/consent`)

When request body is `{}`, the simulator sends `ExpirationDateTime` as `now + 30 days`.

**To omit `ExpirationDateTime` entirely** (field not sent to Salt Edge at all), pass `"expirationDateTime": null` in the request. The upstream payload will then contain only `Permissions` and `Risk` under `Data`—no `ExpirationDateTime` key.

Default payload (when `{}` or when `expirationDateTime` is not provided):

```json
{
  "Data": {
    "ExpirationDateTime": "<now + 30 days, ISO-8601>",
    "Permissions": [
      "ReadAccountsBasic",
      "ReadAccountsDetail",
      "ReadBalances",
      "ReadTransactionsBasic",
      "ReadTransactionsCredits",
      "ReadTransactionsDebits",
      "ReadTransactionsDetail"
    ]
  },
  "Risk": {}
}
```

### PIS default payload sent upstream (`POST /api/uk/pis/consent`)

```json
{
  "paymentProduct": "domestic-payment-consents",
  "Data": {
    "Initiation": {
      "InstructionIdentification": "ANSM023",
      "EndToEndIdentification": "FRESCO.<timestamp>.GFX.37",
      "LocalInstrument": "UK.OBIE.FPS",
      "InstructedAmount": {
        "Amount": "20.00",
        "Currency": "GBP"
      },
      "DebtorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "11280001234567",
        "Name": "Andrea Smith",
        "SecondaryIdentification": "0002"
      },
      "CreditorAccount": {
        "SchemeName": "UK.OBIE.SortCodeAccountNumber",
        "Identification": "08080021325698",
        "Name": "Bob Clements",
        "SecondaryIdentification": "0003"
      },
      "RemittanceInformation": {
        "Reference": "FRESCO-037",
        "Unstructured": "Internal ops code 5120103"
      }
    },
  }
}
```

`Authorisation`, `SCASupportData`, and `Risk` are omitted unless explicitly provided in request.

### CBPII default payload sent upstream (`POST /api/uk/cbpii/consent`)

```json
{
  "Data": {
    "ExpirationDateTime": null,
    "DebtorAccount": {
      "SchemeName": "UK.OBIE.SortCodeAccountNumber",
      "Identification": "60304560543816",
      "Name": "Ricardos Current Account"
    }
  }
}
```

---

## BG Default Consent Object (Empty Request Body)

When caller sends `{}` to `POST /api/bg/ais/consent`, the simulator applies these defaults:

- `providerCode`: `backbase_dev_eu` (or `BG_PROVIDER_CODE` from env)
- `redirectUri`: `https://backbase-dev.com/callback` (or `BG_REDIRECT_URI` / `REDIRECT_URI`)
- `recurringIndicator`: `true` (hardcoded default)
- `frequencyPerDay`: `4` (hardcoded default)
- `validUntil`: `now + 90 days` (hardcoded default)
- `access`: `{ "balances": [], "transactions": [] }`
- `redirectPreferred`: `false` (hardcoded default)

Default payload sent upstream:

```json
{
  "recurringIndicator": true,
  "frequencyPerDay": 4,
  "validUntil": "<now + 90 days, YYYY-MM-DD>",
  "access": {
    "balances": [],
    "transactions": []
  }
}
```

Create request headers sent upstream include:
- `Content-Type: application/json`
- `TPP-Redirect-Preferred: false` (or env override)
- `TPP-Redirect-URI: https://backbase-dev.com/callback` (or env override)
- `X-Request-ID`, `Digest`, `Date`, `TPP-Signature-Certificate`, `Signature`

---

## Configuration (.env)

```bash
# Required
OB_SOFTWARE_ID=your-software-id
OB_PRIVATE_KEY_PATH=./private_key.pem

# Optional
OB_PROVIDER_CODE=backbase_dev_uk
REDIRECT_URI=https://backbase-dev.com/callback
PRIORA_URL=priora.saltedge.com

# Berlin Group (BG)
BG_PROVIDER_CODE=backbase_dev_eu
BG_REDIRECT_URI=https://backbase-dev.com/callback
BG_CERT_FILE_PATH=./client_signed_certifcate.crt
BG_PRIVATE_KEY_PATH=./bg_client_private.key

PORT=8080
```

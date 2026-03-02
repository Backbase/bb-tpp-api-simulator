# Backbase TPP API Simulator

API simulator for UK Open Banking AIS (Account Information Services) and PIS (Payment Initiation Services) consent flows with SaltEdge.

## Table of Contents

- [Setup](#setup)
- [Docker](#docker)
- [API Endpoints](#api-endpoints)
  - [1. Health Check](#1-health-check)
  - [2. API Documentation](#2-api-documentation)
  - [3. Create AIS Consent](#3-create-ais-consent)
  - [4. Get AIS Consent Details](#4-get-ais-consent-details)
  - [5. Revoke AIS Consent](#5-revoke-ais-consent)
  - [6. Create PIS Consent](#6-create-pis-consent)
  - [7. Get PIS Consent Details](#7-get-pis-consent-details)
- [Configuration (.env)](#configuration-env)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp env.example .env
# Edit .env: set OB_SOFTWARE_ID and OB_PRIVATE_KEY_PATH

# 3. Add private key
cp /path/to/your/key.pem ./private_key.pem

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
  -e PRIORA_URL=priora.saltedge.com \
  -e PROTOCOL=https \
  -e REDIRECT_URI=https://backbase-dev.com/callback \
  -e PORT=8080 \
  --name bb-tpp-simulator \
  bb-tpp-api-simulator:latest
```

**Note:** The `OB_PRIVATE_KEY` environment variable supports Azure Key Vault format (single-line with spaces) and will be automatically converted to proper PEM format.

## API Endpoints

**Base URL Placeholder:** `{BASE_URL}`
- **Local:** `http://localhost:8080`

**UK API version:** UK AIS and PIS consent API calls in this simulator target Open Banking `v3.1.11`.

Replace `{BASE_URL}` with the appropriate URL in all examples below.

---

### 1. Health Check
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

### 2. API Documentation
Get list of all available endpoints.

```bash
curl {BASE_URL}/
```

---

### 3. Create AIS Consent
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
| `permissions` | array | List of AIS permissions | All 14 standard permissions |
| `expirationDateTime` | string | ISO 8601 date when consent expires | 30 days from now |

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

### 4. Get AIS Consent Details
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

### 5. Revoke AIS Consent
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

### 6. Create PIS Consent
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
| `authorisation` | object | Authorisation data (not used for scheduled payments) | Default authorisation structure |
| `scaSupportData` | object | SCA support data | Default SCA support structure |
| `risk` | object | Risk data | Default risk structure |
| `permission` | string | Permission for scheduled payments | `Create` (auto-set for scheduled) |

**Default Payment Initiation Structure:**
The default `initiation` includes:
- `LocalInstrument`: `UK.OBIE.FPS`
- `InstructedAmount`: `20.00 GBP`
- `DebtorAccount`: UK sort code account format
- `CreditorAccount`: UK sort code account format
- Full creditor postal address
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

### 7. Get PIS Consent Details
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

## Configuration (.env)

```bash
# Required
OB_SOFTWARE_ID=your-software-id
OB_PRIVATE_KEY_PATH=./private_key.pem

# Optional
OB_PROVIDER_CODE=backbase_dev_uk
REDIRECT_URI=https://backbase-dev.com/callback
PRIORA_URL=priora.saltedge.com
PORT=8080
```

/**
 * UK Open Banking PIS Service - Payment Initiation Services
 * 
 * Handles all communication with SaltEdge Priora API for UK Open Banking Payment Initiation Services.
 * This module provides functions for:
 * - Creating PIS consents (domestic-payment-consents)
 * - Retrieving consent details
 * 
 * NOTE: AIS (Account Information Services) is NOT implemented in this module.
 *       All functions here are specific to UK PIS/PISP operations.
 */

import axios from 'axios';
import { getBaseUrl } from './shared/config.js';
import { discoverOidc, buildAuthorizationUrl } from './shared/utils.js';
import { getClientGrantToken, buildRequestObjectJwt } from './shared/auth.js';

/**
 * Create default PIS consent initiation data
 * Based on UK Open Banking v3.1 specifications and Postman collection defaults
 */
function getDefaultInitiation() {
  return {
    InstructionIdentification: 'ANSM023',
    EndToEndIdentification: `FRESCO.${Date.now()}.GFX.37`,
    LocalInstrument: 'UK.OBIE.FPS',
    InstructedAmount: {
      Amount: '20.00',
      Currency: 'GBP'
    },
    DebtorAccount: {
      SchemeName: 'UK.OBIE.SortCodeAccountNumber',
      Identification: '11280001234567',
      Name: 'Andrea Smith',
      SecondaryIdentification: '0002'
    },
    CreditorAccount: {
      SchemeName: 'UK.OBIE.SortCodeAccountNumber',
      Identification: '08080021325698',
      Name: 'Bob Clements',
      SecondaryIdentification: '0003'
    },
    CreditorPostalAddress: {
      AddressLine: ['10 Downing St, Westminster, London SW1A 2AA, United Kingdom'],
      AddressType: 'Address with house number and street',
      Department: "Prime Minister's Office",
      SubDepartment: 'Cabinet Office',
      StreetName: 'Sir George Downing',
      BuildingNumber: '10',
      PostCode: 'SW1A 2AA',
      TownName: 'City of Westminster London,',
      CountrySubDivision: 'London',
      Country: 'GB'
    },
    RemittanceInformation: {
      Reference: 'FRESCO-037',
      Unstructured: 'Internal ops code 5120103'
    },
    SupplementaryData: {}
  };
}

/**
 * Create default authorisation data
 */
function getDefaultAuthorisation() {
  return {
    AuthorisationType: 'Auth',
    CompletionDateTime: new Date().toISOString()
  };
}

/**
 * Create default SCA support data
 */
function getDefaultSCASupportData() {
  return {
    AppliedAuthenticationApproach: 'AppliedAuthenticationApproach',
    ReferencePaymentOrderId: '156452',
    RequestedScaExemptionType: 'RequestedScaExemptionType'
  };
}

/**
 * Create default risk data
 */
function getDefaultRisk() {
  return {
    PaymentContextCode: 'EcommerceGoods',
    MerchantCategoryCode: '5967',
    MerchantCustomerIdentification: '053598653254',
    DeliveryAddress: {
      AddressLine: [
        'Flat 7',
        'Acacia Lodge'
      ],
      StreetName: 'Acacia Avenue',
      BuildingNumber: '27',
      PostCode: 'GU31 2ZZ',
      TownName: 'Sparsholt',
      CountrySubDivision: 'Wessex',
      Country: 'GB'
    }
  };
}

/**
 * Create PIS (Payment Initiation Service) consent and return authorization URL
 * This creates a domestic-payment-consent for initiating payments
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} redirectUri - OAuth redirect URI
 * @param {string} paymentProduct - Payment product type (default: 'domestic-payment-consents')
 * @param {Object} initiation - Payment initiation data (optional, uses defaults if not provided)
 * @param {Object} authorisation - Authorisation data (optional, uses defaults if not provided)
 * @param {Object} scaSupportData - SCA support data (optional, uses defaults if not provided)
 * @param {Object} risk - Risk data (optional, uses defaults if not provided)
 * @returns {Object} Consent details with authorization URL
 */
export async function createPISConsent({
  providerCode,
  redirectUri,
  paymentProduct = 'domestic-payment-consents',
  initiation,
  authorisation,
  scaSupportData,
  risk
}) {
  const baseUrl = getBaseUrl();
  const scope = 'openid accounts payments'; // PIS scope includes payments
  
  // Merge user-provided data with defaults
  const consentBody = {
    Data: {
      Initiation: initiation || getDefaultInitiation(),
      Authorisation: authorisation || getDefaultAuthorisation(),
      SCASupportData: scaSupportData || getDefaultSCASupportData()
    },
    Risk: risk || getDefaultRisk()
  };
  
  console.log(`🔄 Creating PIS consent for provider: ${providerCode}...`);
  console.log(`   Payment Product: ${paymentProduct}`);
  
  // Discover OIDC endpoints
  const { authorizationEndpoint, tokenEndpoint } = await discoverOidc(providerCode);
  
  // Get client grant token
  const clientGrantAuthorization = await getClientGrantToken(providerCode, redirectUri);
  
  // Create PIS domestic-payment-consent (PISP endpoint)
  const consentUrl = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/pisp/${encodeURIComponent(paymentProduct)}`;
  
  try {
    const { data } = await axios.post(consentUrl, consentBody, {
      headers: {
        'Authorization': clientGrantAuthorization,
        'Content-Type': 'application/json'
      }
    });
    
    const consentId = data?.Data?.ConsentId;
    if (!consentId) {
      throw new Error('No ConsentId in response');
    }
    
    console.log(`✅ PIS Consent created: ${consentId}`);
    
    // Build request JWT for PIS authorization
    const requestJwt = buildRequestObjectJwt({
      tokenEndpoint,
      consentId,
      redirectUri,
      scope
    });
    
    // Build PIS authorization URL
    const authorizationUrl = buildAuthorizationUrl(authorizationEndpoint, {
      redirectUri,
      scope,
      requestJwt
    });
    
    console.log(`🔗 PIS Authorization URL generated`);
    
    return {
      consentId,
      authorizationUrl,
      status: data?.Data?.Status,
    };
  } catch (error) {
    console.error('❌ PIS Consent creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to create PIS consent: ${errorMessage}`);
  }
}

/**
 * Get PIS consent details by consent ID
 * A TPP may optionally retrieve a domestic-payment-consent resource that they have created to check its status.
 * This is a PIS-specific operation for payment consents (not account-access-consents).
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} consentId - PIS consent identifier
 * @param {string} paymentProduct - Payment product type (default: 'domestic-payment-consents')
 * @returns {Object} PIS consent details including status, initiation, and risk data
 */
export async function getConsentDetails(providerCode, consentId, paymentProduct = 'domestic-payment-consents') {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/pisp/${encodeURIComponent(paymentProduct)}/${encodeURIComponent(consentId)}`;
  
  // Get client credentials token for the request
  const defaultRedirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback';
  const clientGrantToken = await getClientGrantToken(providerCode, defaultRedirectUri);
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': clientGrantToken
      }
    });
    
    return data;
  } catch (error) {
    console.error('Failed to fetch PIS consent details:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to fetch PIS consent details: ${errorMessage}`);
  }
}


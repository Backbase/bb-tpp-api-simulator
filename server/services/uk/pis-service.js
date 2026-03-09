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
    RemittanceInformation: {
      Reference: 'FRESCO-037',
      Unstructured: 'Internal ops code 5120103'
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
 * @param {Object} authorisation - Authorisation data (optional, forwarded only if provided)
 * @param {Object} scaSupportData - SCA support data (optional, forwarded only if provided)
 * @param {Object} risk - Risk data (optional, forwarded only if provided)
 * @param {string} permission - Permission for scheduled payments (optional, defaults to 'Create')
 * @returns {Object} Consent details with authorization URL
 */
export async function createPISConsent({
  providerCode,
  redirectUri,
  paymentProduct = 'domestic-payment-consents',
  initiation,
  authorisation,
  scaSupportData,
  risk,
  permission
}) {
  const baseUrl = getBaseUrl();
  const scope = 'openid accounts payments'; // PIS scope includes payments
  
  // Determine if this is a scheduled payment
  // Payment types that require Permission field
  const requiresPermission = 
    paymentProduct === 'domestic-scheduled-payment-consents' ||
    paymentProduct === 'domestic-standing-order-consents';
  
  const isScheduledPayment = paymentProduct === 'domestic-scheduled-payment-consents';
  
  // Validate RequestedExecutionDateTime for scheduled payments
  if (isScheduledPayment && initiation && !initiation.RequestedExecutionDateTime) {
    throw new Error('RequestedExecutionDateTime is required for scheduled payments');
  }
  
  // Build consent body - same structure for all payment types
  const consentBody = {
    Data: {
      Initiation: initiation || getDefaultInitiation()
    }
  };

  // Optional fields are only forwarded when explicitly provided by caller
  if (authorisation != null) {
    consentBody.Data.Authorisation = authorisation;
  }
  if (scaSupportData != null) {
    consentBody.Data.SCASupportData = scaSupportData;
  }
  if (risk != null) {
    consentBody.Risk = risk;
  }
  
  // Add Permission field for payment types that require it
  if (requiresPermission) {
    consentBody.Data.Permission = permission || 'Create';
  }
  
  console.log(`🔄 Creating PIS consent for provider: ${providerCode}...`);
  console.log(`   Payment Product: ${paymentProduct}`);
  
  // Discover OIDC endpoints
  const { authorizationEndpoint, tokenEndpoint } = await discoverOidc(providerCode);
  
  // Get client grant token
  const clientGrantAuthorization = await getClientGrantToken(providerCode, redirectUri);
  
  // Create PIS domestic-payment-consent (PISP endpoint)
  const consentUrl = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1.11/pisp/${encodeURIComponent(paymentProduct)}`;
  
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
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1.11/pisp/${encodeURIComponent(paymentProduct)}/${encodeURIComponent(consentId)}`;
  
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


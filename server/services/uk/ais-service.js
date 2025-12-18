/**
 * UK Open Banking AIS Service - Account Information Services
 * 
 * Handles all communication with SaltEdge Priora API for UK Open Banking Account Information Services.
 * This module provides functions for:
 * - Creating AIS consents (account-access-consents)
 * - Retrieving consent details
 * - Revoking consents
 * 
 * NOTE: PIS (Payment Initiation Services) is NOT implemented in this module.
 *       All functions here are specific to UK AIS/AISP operations.
 */

import axios from 'axios';
import { getBaseUrl } from './shared/config.js';
import { discoverOidc, buildAuthorizationUrl } from './shared/utils.js';
import { getClientGrantToken, buildRequestObjectJwt } from './shared/auth.js';

/**
 * Create AIS (Account Information Service) consent and return authorization URL
 * This creates an account-access-consent for reading account information
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} redirectUri - OAuth redirect URI
 * @param {Array<string>} permissions - AIS permissions (ReadAccounts, ReadBalances, etc.)
 * @param {string} expirationDateTime - Consent expiration date
 * @returns {Object} Consent details with authorization URL
 */
export async function createAISConsent({
  providerCode,
  redirectUri,
  permissions,
  expirationDateTime
}) {
  const baseUrl = getBaseUrl();
  const scope = 'openid accounts payments'; // AIS scope includes accounts
  
  // Default AIS permissions for account information access
  // Only include permissions valid for UK Open Banking v3.1
  const defaultAISPermissions = [
    'ReadAccountsBasic', 'ReadAccountsDetail', 'ReadBalances', 
    'ReadBeneficiariesBasic', 'ReadBeneficiariesDetail',
    'ReadTransactionsBasic', 'ReadTransactionsCredits',
    'ReadTransactionsDebits', 'ReadTransactionsDetail',
    'ReadPAN', 'ReadParty', 'ReadDirectDebits',
    'ReadStandingOrdersBasic', 'ReadStandingOrdersDetail'
  ];
  
  const isoNowPlusMinutes = (minutes) => {
    return new Date(Date.now() + minutes * 60000).toISOString();
  };
  
  const consentBody = {
    Data: {
      ExpirationDateTime: expirationDateTime || isoNowPlusMinutes(60 * 24 * 30),
      Permissions: permissions || defaultAISPermissions
    }
  };
  
  console.log(`🔄 Creating AIS consent for provider: ${providerCode}...`);
  
  // Discover OIDC endpoints
  const { authorizationEndpoint, tokenEndpoint } = await discoverOidc(providerCode);
  
  // Get client grant token
  const clientGrantAuthorization = await getClientGrantToken(providerCode, redirectUri);
  
  // Create AIS account-access-consent (AISP endpoint)
  const consentUrl = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/account-access-consents`;
  
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
    
    console.log(`✅ AIS Consent created: ${consentId}`);
    
    // Build request JWT for AIS authorization
    const requestJwt = buildRequestObjectJwt({
      tokenEndpoint,
      consentId,
      redirectUri,
      scope
    });
    
    // Build AIS authorization URL
    const authorizationUrl = buildAuthorizationUrl(authorizationEndpoint, {
      redirectUri,
      scope,
      requestJwt
    });
    
    console.log(`🔗 AIS Authorization URL generated`);
    
    return {
      consentId,
      authorizationUrl,
      status: data?.Data?.Status,
    };
  } catch (error) {
    console.error('❌ AIS Consent creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to create AIS consent: ${errorMessage}`);
  }
}

/**
 * Get AIS consent details by consent ID
 * A TPP may optionally retrieve an account-access-consent resource that they have created to check its status.
 * This is an AIS-specific operation for account-access-consents (not payment consents).
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} consentId - AIS consent identifier
 * @returns {Object} AIS consent details including status, permissions, and expiration
 */
export async function getConsentDetails(providerCode, consentId) {  
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/account-access-consents/${encodeURIComponent(consentId)}`;
  
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
    console.error('Failed to fetch AIS consent details:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to fetch AIS consent details: ${errorMessage}`);
  }
}

/**
 * Revoke/Delete AIS consent by consent ID
 * A TPP may revoke an account-access-consent resource that they have created.
 * This is an AIS-specific operation for account-access-consents (not payment consents).
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} consentId - AIS consent identifier to revoke
 * @returns {boolean} True if consent was successfully revoked
 */
export async function revokeAISConsent(providerCode, consentId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/account-access-consents/${encodeURIComponent(consentId)}`;
  
  // Get client credentials token for the request
  const defaultRedirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback';
  const clientGrantToken = await getClientGrantToken(providerCode, defaultRedirectUri);
  
  try {
    const response = await axios.delete(url, {
      headers: {
        'Authorization': clientGrantToken
      }
    });
    
    // UK Open Banking DELETE endpoint returns 204 No Content on success
    return true;
  } catch (error) {
    console.error('Failed to revoke AIS consent:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to revoke AIS consent: ${errorMessage}`);
  }
}


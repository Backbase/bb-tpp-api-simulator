/**
 * UK Open Banking CBPII Service - Confirmation of Funds
 *
 * Handles communication with SaltEdge Priora API for UK Open Banking CBPII.
 * This module provides functions for:
 * - Creating CBPII funds-confirmation consents
 * - Retrieving CBPII consent details
 */

import axios from 'axios';
import { getBaseUrl } from './shared/config.js';
import { discoverOidc, buildAuthorizationUrl } from './shared/utils.js';
import { getClientGrantToken, buildRequestObjectJwt } from './shared/auth.js';

function getDefaultDebtorAccount() {
  return {
    SchemeName: 'UK.OBIE.SortCodeAccountNumber',
    Identification: '60304560543816',
    Name: 'Ricardos Current Account'
  };
}

/**
 * Create CBPII (Confirmation of Funds) consent and return authorization URL.
 *
 * @param {string} providerCode - Open Banking provider code
 * @param {string} redirectUri - OAuth redirect URI
 * @param {string} expirationDateTime - Consent expiration date
 * @param {Object} debtorAccount - Debtor account details
 * @returns {Object} Consent details with authorization URL
 */
export async function createCBPIIConsent({
  providerCode,
  redirectUri,
  expirationDateTime,
  debtorAccount
}) {
  const baseUrl = getBaseUrl();
  // Postman collection uses this scope for UK Open Banking request-object flow.
  const scope = 'openid accounts payments';

  const consentBody = {
    Data: {
      ExpirationDateTime: expirationDateTime !== undefined ? expirationDateTime : null,
      DebtorAccount: debtorAccount || getDefaultDebtorAccount()
    }
  };

  console.log(`🔄 Creating CBPII consent for provider: ${providerCode}...`);

  const { authorizationEndpoint, tokenEndpoint } = await discoverOidc(providerCode);
  const clientGrantAuthorization = await getClientGrantToken(providerCode, redirectUri);

  const consentUrl = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1.11/cbpii/funds-confirmation-consents`;

  try {
    const { data } = await axios.post(consentUrl, consentBody, {
      headers: {
        Authorization: clientGrantAuthorization,
        'Content-Type': 'application/json'
      }
    });

    const consentId = data?.Data?.ConsentId;
    if (!consentId) {
      throw new Error('No ConsentId in response');
    }

    console.log(`✅ CBPII Consent created: ${consentId}`);

    const requestJwt = buildRequestObjectJwt({
      tokenEndpoint,
      consentId,
      redirectUri,
      scope
    });

    const authorizationUrl = buildAuthorizationUrl(authorizationEndpoint, {
      redirectUri,
      scope,
      requestJwt
    });

    console.log('🔗 CBPII Authorization URL generated');

    return {
      consentId,
      authorizationUrl,
      status: data?.Data?.Status
    };
  } catch (error) {
    console.error('❌ CBPII Consent creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));

    const errorMessage = error.response?.data?.error
      || error.response?.data?.message
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to create CBPII consent: ${errorMessage}`);
  }
}

/**
 * Get CBPII consent details by consent ID.
 *
 * @param {string} providerCode - Open Banking provider code
 * @param {string} consentId - CBPII consent identifier
 * @returns {Object} CBPII consent details
 */
export async function getConsentDetails(providerCode, consentId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1.11/cbpii/funds-confirmation-consents/${encodeURIComponent(consentId)}`;

  const defaultRedirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback';
  const clientGrantToken = await getClientGrantToken(providerCode, defaultRedirectUri);

  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: clientGrantToken
      }
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch CBPII consent details:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));

    const errorMessage = error.response?.data?.error
      || error.response?.data?.message
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to fetch CBPII consent details: ${errorMessage}`);
  }
}

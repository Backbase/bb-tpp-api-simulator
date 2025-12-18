/**
 * UK Open Banking SaltEdge Extended Functions - ARCHIVED
 * 
 * These functions are not currently used in the API but preserved for future reference.
 * They provide additional AIS capabilities beyond basic consent flow.
 * 
 * To use these functions:
 * 1. Import needed functions from this file
 * 2. Add corresponding routes in routes/uk/ais.js
 * 3. Update documentation
 * 
 * ARCHIVED DATE: 2025-11-02
 * REASON: Simplified API - focusing on core consent flow only
 */

import axios from 'axios';
import { getBaseUrl } from './shared/config.js';

/**
 * Exchange authorization code for AIS access token
 * This is used to get an access token to fetch accounts information post AIS consent authorization
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} authorizationCode - Authorization code from OAuth redirect
 * @param {string} redirectUri - OAuth redirect URI (must match consent creation)
 * @returns {Object} Access token and metadata
 */
export async function exchangeCodeForToken(providerCode, authorizationCode, redirectUri) {
  const baseUrl = getBaseUrl();
  
  // Need to import these from parent or duplicate
  const clientId = process.env.OB_SOFTWARE_ID;
  if (!clientId) {
    throw new Error('OB_SOFTWARE_ID not configured in .env');
  }
  
  // Load private key
  const keyPath = process.env.OB_PRIVATE_KEY_PATH;
  const keyValue = process.env.OB_PRIVATE_KEY;
  let privateKey;
  
  if (keyValue && keyValue.includes('BEGIN')) {
    // Replace escaped newlines with actual newlines
    // This handles Azure Key Vault secrets that come as single-line strings
    privateKey = keyValue.replace(/\\n/g, '\n');
  } else if (keyPath) {
    const fs = await import('fs');
    const path = await import('path');
    const fullPath = path.isAbsolute(keyPath) 
      ? keyPath 
      : path.join(process.cwd(), keyPath);
    
    if (fs.existsSync(fullPath)) {
      privateKey = fs.readFileSync(fullPath, 'utf8');
    }
  }
  
  if (!privateKey) {
    throw new Error('Private key not configured. Set OB_PRIVATE_KEY or OB_PRIVATE_KEY_PATH in .env');
  }
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 600;
  
  const tokenEndpoint = `${baseUrl}/api/oidc/${encodeURIComponent(providerCode)}/tokens`;
  
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');
  
  const generateUuid = () => {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    const rnd = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    return `${rnd()}-${rnd().slice(0,4)}-${rnd().slice(0,4)}-${rnd().slice(0,4)}-${rnd()}${rnd()}`;
  };
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jwi: generateUuid(),
    exp,
    iat: now
  };
  
  const clientAssertion = jwt.sign(payload, privateKey, { 
    algorithm: 'RS256', 
    header 
  });
  
  const body = {
    provider_code: providerCode,
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
    redirect_uri: redirectUri,
    client_id: clientId
  };
  
  try {
    const { data } = await axios.post(tokenEndpoint, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!data.access_token) {
      throw new Error('No access_token in response');
    }
    
    return {
      accessToken: `Bearer ${data.access_token}`,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    };
  } catch (error) {
    console.error('Token exchange failed:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to exchange code for token: ${errorMessage}`);
  }
}

/**
 * Fetch accounts using AIS access token
 * Retrieves all accounts authorized under the AIS consent
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Account list with details
 */
export async function getAccounts(providerCode, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': accessToken
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch accounts: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Refresh AIS accounts data
 * Triggers a refresh of account information from the ASPSP
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Refresh operation status
 */
export async function refreshAccounts(providerCode, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts/refresh`;
  
  try {
    const { data } = await axios.post(url, 
      { InitiatedByCustomer: false },
      {
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return data;
  } catch (error) {
    throw new Error(`Failed to refresh accounts: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Get AIS account refresh status
 * Checks the status of an ongoing account data refresh operation
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Current refresh status
 */
export async function getRefreshStatus(providerCode, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts/refresh/status`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': accessToken
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to get refresh status: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Fetch account transactions using AIS access token
 * Retrieves transaction history for a specific account
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accountId - Account identifier
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Transaction list with details
 */
export async function getAccountTransactions(providerCode, accountId, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts/${encodeURIComponent(accountId)}/transactions`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': accessToken
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch transactions: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Fetch account balances using AIS access token
 * Retrieves current balance information for a specific account
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accountId - Account identifier
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Balance information
 */
export async function getAccountBalances(providerCode, accountId, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts/${encodeURIComponent(accountId)}/balances`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': accessToken
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch balances: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Fetch account standing orders using AIS access token
 * Retrieves standing order information for a specific account
 * 
 * @param {string} providerCode - Open Banking provider code
 * @param {string} accountId - Account identifier
 * @param {string} accessToken - Bearer token from AIS authorization
 * @returns {Object} Standing orders list
 */
export async function getAccountStandingOrders(providerCode, accountId, accessToken) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/${encodeURIComponent(providerCode)}/open-banking/v3.1/aisp/accounts/${encodeURIComponent(accountId)}/standing-orders`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'Authorization': accessToken
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch standing orders: ${error.response?.data?.error || error.message}`);
  }
}


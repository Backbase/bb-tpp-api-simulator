/**
 * UK Open Banking Authentication Utilities
 * Shared authentication functions for UK Open Banking services
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getBaseUrl, getClientId, getPrivateKey } from './config.js';
import { generateUuid } from './utils.js';

/**
 * Get client credentials access token (client grant)
 * This is used to get an access token for initiating a consent flow
 */
export async function getClientGrantToken(providerCode, redirectUri) {
  const baseUrl = getBaseUrl();
  const clientId = getClientId();
  const privateKey = getPrivateKey();
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 600; // 10 minutes
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const aud = `${baseUrl}/api/oidc/${encodeURIComponent(providerCode)}/tokens`;
  
  const payload = {
    iss: clientId,
    sub: clientId,
    aud,
    jti: generateUuid(),
    exp,
    iat: now
  };
  
  const clientAssertion = jwt.sign(payload, privateKey, { 
    algorithm: 'RS256', 
    header 
  });
  
  const body = {
    provider_code: providerCode,
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
    redirect_uri: redirectUri,
    client_id: clientId
  };
  
  try {
    const { data } = await axios.post(aud, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!data.access_token) {
      throw new Error('No access_token in response');
    }
    
    return `Bearer ${data.access_token}`;
  } catch (error) {
    console.error('Client grant token failed:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || JSON.stringify(error.response?.data)
      || error.message;
    throw new Error(`Failed to get client grant token: ${errorMessage}`);
  }
}

/**
 * Build request object JWT for authorization
 */
export function buildRequestObjectJwt({ tokenEndpoint, consentId, redirectUri, scope }) {
  const clientId = getClientId();
  const privateKey = getPrivateKey();
  
  const issuedAt = Math.floor(Date.now() / 1000) - 1;
  const expiresAt = issuedAt + 60;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    claims: {
      id_token: {
        openbanking_intent_id: { 
          essential: true, 
          value: consentId 
        }
      }
    },
    client_id: clientId,
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jti: generateUuid(),
    redirect_uri: redirectUri,
    scope,
    response_type: 'code',
    exp: expiresAt,
    iat: issuedAt
  };
  
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', header });
}


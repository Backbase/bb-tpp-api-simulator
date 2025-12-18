/**
 * UK Open Banking Utility Functions
 * Shared utility functions for UK Open Banking services
 */

import axios from 'axios';
import crypto from 'crypto';
import { getBaseUrl, getClientId } from './config.js';

/**
 * Generate a random UUID
 */
export function generateUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  const rnd = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${rnd()}-${rnd().slice(0,4)}-${rnd().slice(0,4)}-${rnd().slice(0,4)}-${rnd()}${rnd()}`;
}

/**
 * Discover OIDC endpoints for a provider
 */
export async function discoverOidc(providerCode) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/.well-known/openid-configuration/${encodeURIComponent(providerCode)}`;
  
  try {
    const { data } = await axios.get(url);
    
    if (!data.authorization_endpoint || !data.token_endpoint) {
      throw new Error('OIDC discovery missing required endpoints');
    }
    
    return {
      authorizationEndpoint: data.authorization_endpoint,
      tokenEndpoint: data.token_endpoint
    };
  } catch (error) {
    throw new Error(`OIDC discovery failed: ${error.message}`);
  }
}

/**
 * Build authorization URL
 */
export function buildAuthorizationUrl(authorizationEndpoint, { redirectUri, scope, requestJwt }) {
  const clientId = getClientId();
  const u = new URL(authorizationEndpoint);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', scope);
  u.searchParams.set('request', requestJwt);
  u.searchParams.set('redirect_uri', redirectUri);
  return u.toString();
}


/**
 * Berlin Group AIS consent service.
 */

import axios from 'axios';
import {
  getBgBaseUrl,
  getBgBasePath,
  getBgCertPem,
  getBgPrivateKey
} from './shared/config.js';
import { buildRequiredSignedHeaders } from './shared/signing.js';

function buildConsentBaseUrl(providerCode) {
  const baseUrl = getBgBaseUrl();
  const basePath = getBgBasePath(providerCode);
  return `${baseUrl}${basePath}/consents`;
}

function toErrorMessage(action, error) {
  const details = error.response?.data
    ? JSON.stringify(error.response.data)
    : error.message;
  return `${action} failed: ${details}`;
}

function requiredHeaders(body = '', additionalSignedHeaders = {}) {
  const certPem = getBgCertPem();
  const privateKeyPem = getBgPrivateKey();
  return buildRequiredSignedHeaders({ privateKeyPem, certPem, body, additionalSignedHeaders });
}

export async function createConsent({
  providerCode,
  recurringIndicator,
  frequencyPerDay,
  validUntil,
  access,
  redirectPreferred,
  redirectUri
}) {
  const url = buildConsentBaseUrl(providerCode);
  const bodyObject = {
    recurringIndicator,
    frequencyPerDay,
    validUntil,
    access
  };
  const body = JSON.stringify(bodyObject);
  const headers = {
    ...requiredHeaders(body, { 'TPP-Redirect-URI': redirectUri }),
    'Content-Type': 'application/json',
    'TPP-Redirect-Preferred': String(redirectPreferred),
    'TPP-Redirect-URI': redirectUri
  };

  try {
    const { data } = await axios.post(url, body, { headers });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Create BG AIS consent', error));
  }
}

export async function getConsent(providerCode, consentId) {
  const url = `${buildConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}`;
  try {
    const { data } = await axios.get(url, { headers: requiredHeaders('') });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG AIS consent', error));
  }
}

export async function getConsentStatus(providerCode, consentId) {
  const url = `${buildConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}/status`;
  try {
    const { data } = await axios.get(url, { headers: requiredHeaders('') });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG AIS consent status', error));
  }
}

export async function deleteConsent(providerCode, consentId) {
  const url = `${buildConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}`;
  try {
    await axios.delete(url, { headers: requiredHeaders('') });
    return true;
  } catch (error) {
    throw new Error(toErrorMessage('Delete BG AIS consent', error));
  }
}


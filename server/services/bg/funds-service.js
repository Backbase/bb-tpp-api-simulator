/**
 * Berlin Group Funds (CBPII/CoF) service.
 */

import axios from 'axios';
import {
  getBgBaseUrl,
  getBgBasePath,
  getBgCertPem,
  getBgPrivateKey
} from './shared/config.js';
import { buildRequiredSignedHeaders } from './shared/signing.js';

function buildFundsConfirmationsUrl(providerCode) {
  const baseUrl = getBgBaseUrl();
  const basePath = getBgBasePath(providerCode);
  return `${baseUrl}${basePath}/funds-confirmations`;
}

function buildFundsConsentBaseUrl(providerCode) {
  const baseUrl = getBgBaseUrl();
  const providerPath = `/${encodeURIComponent(providerCode)}/api/berlingroup/v2/consents/confirmation-of-funds`;
  return `${baseUrl}${providerPath}`;
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

export async function createFundsConsent({
  providerCode,
  account,
  redirectPreferred,
  redirectUri
}) {
  const url = buildFundsConsentBaseUrl(providerCode);
  const bodyObject = { account };
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
    throw new Error(toErrorMessage('Create BG Funds consent', error));
  }
}

export async function getFundsConsent(providerCode, consentId) {
  const url = `${buildFundsConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG Funds consent', error));
  }
}

export async function getFundsConsentStatus(providerCode, consentId) {
  const url = `${buildFundsConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}/status`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG Funds consent status', error));
  }
}

export async function deleteFundsConsent(providerCode, consentId) {
  const url = `${buildFundsConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}`;
  try {
    await axios.delete(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return true;
  } catch (error) {
    throw new Error(toErrorMessage('Delete BG Funds consent', error));
  }
}

export async function getFundsConsentAuthorisation(providerCode, consentId, authorisationId) {
  const url = `${buildFundsConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}/authorisations/${encodeURIComponent(authorisationId)}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG Funds consent authorisation', error));
  }
}

export async function createFundsConfirmation({
  providerCode,
  consentId,
  account,
  instructedAmount,
  redirectPreferred
}) {
  const url = buildFundsConfirmationsUrl(providerCode);
  const bodyObject = {
    account,
    instructedAmount
  };
  const body = JSON.stringify(bodyObject);
  const headers = {
    ...requiredHeaders(body),
    'Content-Type': 'application/json',
    'Consent-Id': consentId,
    'TPP-Redirect-Preferred': String(redirectPreferred)
  };

  try {
    const { data } = await axios.post(url, body, { headers });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Create BG Funds confirmation', error));
  }
}

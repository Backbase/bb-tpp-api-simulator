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

function buildAccountsBaseUrl(providerCode) {
  const baseUrl = getBgBaseUrl();
  const basePath = getBgBasePath(providerCode);
  return `${baseUrl}${basePath}/accounts`;
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

function buildBgAisDataHeaders({ consentId, psuDeviceId, psuIpAddress, psuDeviceName }) {
  const headers = {
    ...requiredHeaders(''),
    'Content-Type': 'application/json',
    'Consent-Id': consentId
  };

  if (psuDeviceId) headers['PSU-Device-ID'] = psuDeviceId;
  if (psuIpAddress) headers['Psu-IP-Address'] = psuIpAddress;
  if (psuDeviceName) headers['PSU-Device-Name'] = psuDeviceName;

  return headers;
}

function addOptionalQueryParams(url, queryParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
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
    const { data } = await axios.get(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG AIS consent', error));
  }
}

export async function getConsentStatus(providerCode, consentId) {
  const url = `${buildConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}/status`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage('Get BG AIS consent status', error));
  }
}

export async function deleteConsent(providerCode, consentId) {
  const url = `${buildConsentBaseUrl(providerCode)}/${encodeURIComponent(consentId)}`;
  try {
    await axios.delete(url, {
      headers: {
        ...requiredHeaders(''),
        'Content-Type': 'application/json'
      }
    });
    return true;
  } catch (error) {
    throw new Error(toErrorMessage('Delete BG AIS consent', error));
  }
}

export async function listAccounts(providerCode, options = {}) {
  const { consentId, psuDeviceId, psuIpAddress, psuDeviceName } = options;
  const url = buildAccountsBaseUrl(providerCode);
  const { status, data } = await axios.get(url, {
    headers: buildBgAisDataHeaders({
      consentId,
      psuDeviceId,
      psuIpAddress,
      psuDeviceName
    }),
    validateStatus: () => true
  });
  return { status, data };
}

export async function getSingleAccount(providerCode, accountId, options = {}) {
  const { consentId, psuDeviceId, psuIpAddress, psuDeviceName, withBalance } = options;
  const baseUrl = `${buildAccountsBaseUrl(providerCode)}/${encodeURIComponent(accountId)}`;
  const url = addOptionalQueryParams(baseUrl, { withBalance });
  const { status, data } = await axios.get(url, {
    headers: buildBgAisDataHeaders({
      consentId,
      psuDeviceId,
      psuIpAddress,
      psuDeviceName
    }),
    validateStatus: () => true
  });
  return { status, data };
}

export async function getAccountTransactions(providerCode, accountId, options = {}) {
  const { consentId, psuDeviceId, psuIpAddress, psuDeviceName, bookingStatus } = options;
  const baseUrl = `${buildAccountsBaseUrl(providerCode)}/${encodeURIComponent(accountId)}/transactions`;
  const url = addOptionalQueryParams(baseUrl, { bookingStatus });
  const { status, data } = await axios.get(url, {
    headers: buildBgAisDataHeaders({
      consentId,
      psuDeviceId,
      psuIpAddress,
      psuDeviceName
    }),
    validateStatus: () => true
  });
  return { status, data };
}

export async function getAccountBalances(providerCode, accountId, options = {}) {
  const { consentId, psuDeviceId, psuIpAddress, psuDeviceName } = options;
  const url = `${buildAccountsBaseUrl(providerCode)}/${encodeURIComponent(accountId)}/balances`;
  const { status, data } = await axios.get(url, {
    headers: buildBgAisDataHeaders({
      consentId,
      psuDeviceId,
      psuIpAddress,
      psuDeviceName
    }),
    validateStatus: () => true
  });
  return { status, data };
}


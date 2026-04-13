/**
 * Berlin Group PIS (Payment Initiation Services) service.
 *
 * Handles single payments (/payments) and periodic payments (/periodic-payments)
 * for all supported payment products.
 */

import axios from 'axios';
import {
  getBgBaseUrl,
  getBgBasePath,
  getBgCertPem,
  getBgPrivateKey
} from './shared/config.js';
import { buildRequiredSignedHeaders } from './shared/signing.js';

function buildPaymentBaseUrl(providerCode, paymentType, paymentProduct) {
  const baseUrl = getBgBaseUrl();
  const basePath = getBgBasePath(providerCode);
  return `${baseUrl}${basePath}/${paymentType}/${encodeURIComponent(paymentProduct)}`;
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

function readOnlyHeaders() {
  return {
    ...requiredHeaders(''),
    'Content-Type': 'application/json'
  };
}

export async function createPayment({
  providerCode,
  paymentType,
  paymentProduct,
  body,
  redirectPreferred,
  redirectUri
}) {
  const url = buildPaymentBaseUrl(providerCode, paymentType, paymentProduct);
  const bodyStr = JSON.stringify(body);
  const headers = {
    ...requiredHeaders(bodyStr, { 'TPP-Redirect-URI': redirectUri }),
    'Content-Type': 'application/json',
    'TPP-Redirect-Preferred': String(redirectPreferred),
    'TPP-Redirect-URI': redirectUri,
    'Psu-IP-Address': '127.0.0.1'
  };

  try {
    const { data } = await axios.post(url, bodyStr, { headers });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`Create BG ${paymentType} (${paymentProduct})`, error));
  }
}

export async function getPayment(providerCode, paymentType, paymentProduct, paymentId) {
  const url = `${buildPaymentBaseUrl(providerCode, paymentType, paymentProduct)}/${encodeURIComponent(paymentId)}`;
  try {
    const { data } = await axios.get(url, { headers: readOnlyHeaders() });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`Get BG ${paymentType} (${paymentProduct})`, error));
  }
}

export async function getPaymentStatus(providerCode, paymentType, paymentProduct, paymentId) {
  const url = `${buildPaymentBaseUrl(providerCode, paymentType, paymentProduct)}/${encodeURIComponent(paymentId)}/status`;
  try {
    const { data } = await axios.get(url, { headers: readOnlyHeaders() });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`Get BG ${paymentType} status (${paymentProduct})`, error));
  }
}

export async function getPaymentAuthorisation(providerCode, paymentType, paymentProduct, paymentId, authorisationId) {
  const base = buildPaymentBaseUrl(providerCode, paymentType, paymentProduct);
  const url = `${base}/${encodeURIComponent(paymentId)}/authorisations/${encodeURIComponent(authorisationId)}`;
  try {
    const { data } = await axios.get(url, { headers: readOnlyHeaders() });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`Get BG ${paymentType} authorisation (${paymentProduct})`, error));
  }
}

export async function deletePayment({
  providerCode,
  paymentType,
  paymentProduct,
  paymentId,
  redirectPreferred,
  redirectUri
}) {
  const url = `${buildPaymentBaseUrl(providerCode, paymentType, paymentProduct)}/${encodeURIComponent(paymentId)}`;
  const headers = {
    ...requiredHeaders('', { 'TPP-Redirect-URI': redirectUri }),
    'Content-Type': 'application/json',
    'TPP-Redirect-Preferred': String(redirectPreferred),
    'TPP-Redirect-URI': redirectUri
  };

  try {
    const { status, data } = await axios.delete(url, {
      headers,
      validateStatus: () => true
    });
    return { status, data };
  } catch (error) {
    throw new Error(toErrorMessage(`Delete BG ${paymentType} (${paymentProduct})`, error));
  }
}

export async function listCancellationAuthorisations(providerCode, paymentType, paymentProduct, paymentId) {
  const base = buildPaymentBaseUrl(providerCode, paymentType, paymentProduct);
  const url = `${base}/${encodeURIComponent(paymentId)}/cancellation-authorisations`;
  try {
    const { data } = await axios.get(url, { headers: readOnlyHeaders() });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`List BG ${paymentType} cancellation authorisations (${paymentProduct})`, error));
  }
}

export async function getCancellationAuthorisation(providerCode, paymentType, paymentProduct, paymentId, authorisationId) {
  const base = buildPaymentBaseUrl(providerCode, paymentType, paymentProduct);
  const url = `${base}/${encodeURIComponent(paymentId)}/cancellation-authorisations/${encodeURIComponent(authorisationId)}`;
  try {
    const { data } = await axios.get(url, { headers: readOnlyHeaders() });
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(`Get BG ${paymentType} cancellation authorisation (${paymentProduct})`, error));
  }
}

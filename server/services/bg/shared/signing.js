/**
 * Berlin Group HTTP signature helpers.
 */

import crypto, { X509Certificate } from 'crypto';

export function createRequestId() {
  return crypto.randomUUID();
}

export function createDateHeader() {
  return new Date().toUTCString();
}

export function buildDigest(body = '') {
  return `SHA-256=${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`;
}

function getKeyId(certPem) {
  if (process.env.BG_KEY_ID) return process.env.BG_KEY_ID;
  const cert = new X509Certificate(certPem);
  const issuerDn = cert.issuer.replace(/\n/g, ',');
  return `SN=${cert.serialNumber},DN=${issuerDn}`;
}

function getCertificateHeader(certPem) {
  return Buffer.from(certPem, 'utf8').toString('base64');
}

function buildSignatureValue(privateKeyPem, signingString) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

export function buildRequiredSignedHeaders({ privateKeyPem, certPem, body = '', additionalSignedHeaders = {} }) {
  const requestId = createRequestId();
  const date = createDateHeader();
  const digest = buildDigest(body);
  const baseHeaders = {
    digest,
    date,
    'x-request-id': requestId
  };
  const normalizedAdditionalHeaders = Object.entries(additionalSignedHeaders).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = String(value);
    return acc;
  }, {});
  const allSignedHeaders = {
    ...baseHeaders,
    ...normalizedAdditionalHeaders
  };
  const signedHeaderNames = Object.keys(allSignedHeaders);
  const signingString = signedHeaderNames
    .map((name) => `${name}: ${allSignedHeaders[name]}`)
    .join('\n');
  const signature = buildSignatureValue(privateKeyPem, signingString);
  const keyId = getKeyId(certPem);

  return {
    'X-Request-ID': requestId,
    Digest: digest,
    Date: date,
    'TPP-Signature-Certificate': getCertificateHeader(certPem),
    Signature: `keyId="${keyId}",algorithm="rsa-sha256",headers="${signedHeaderNames.join(' ')}",signature="${signature}"`
  };
}


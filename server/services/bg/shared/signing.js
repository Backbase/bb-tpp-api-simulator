/**
 * Berlin Group HTTP signature helpers.
 */

import crypto, { X509Certificate } from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

  // Match keyId issuer formatting used during successful TPP registration:
  // OpenSSL RFC2253 output order (e.g. ST=...,C=...,O=...,CN=...).
  let issuerDn;
  const tempPath = path.join(os.tmpdir(), `bg-cert-${crypto.randomUUID()}.crt`);
  try {
    fs.writeFileSync(tempPath, certPem, 'utf8');
    const issuerOutput = execFileSync(
      'openssl',
      ['x509', '-in', tempPath, '-noout', '-issuer', '-nameopt', 'RFC2253'],
      { encoding: 'utf8' }
    ).trim();
    issuerDn = issuerOutput.replace(/^issuer=/, '');
  } catch {
    // Fallback to Node issuer format if OpenSSL is unavailable.
    issuerDn = cert.issuer.replace(/\n/g, ',');
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // no-op
    }
  }

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
    'x-request-id': requestId,
    digest,
    date
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


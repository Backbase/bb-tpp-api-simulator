/**
 * Berlin Group configuration helpers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveProjectPath(targetPath) {
  if (path.isAbsolute(targetPath)) return targetPath;
  const projectRoot = path.join(__dirname, '..', '..', '..', '..');
  return path.join(projectRoot, targetPath);
}

function readConfiguredFile(envPathKey, envValueKey, fallbackPath) {
  const inlineValue = process.env[envValueKey];
  if (inlineValue && inlineValue.includes('BEGIN')) {
    return inlineValue.includes('\\n') ? inlineValue.replace(/\\n/g, '\n') : inlineValue;
  }

  const configuredPath = process.env[envPathKey] || fallbackPath;
  const fullPath = resolveProjectPath(configuredPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${envPathKey}: file not found at ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

export function getBgBaseUrl() {
  const protocol = process.env.PROTOCOL || 'https';
  const prioraUrl = process.env.PRIORA_URL || 'priora.saltedge.com';
  return `${protocol}://${prioraUrl}`;
}

export function getBgProviderCode() {
  return process.env.BG_PROVIDER_CODE || 'backbase_dev_eu';
}

export function getBgBasePath(providerCode) {
  const baseTemplate = '/{provider_code}/api/berlingroup/v1';
  return baseTemplate.replace('{provider_code}', encodeURIComponent(providerCode));
}

export function getBgRedirectUri() {
  return process.env.BG_REDIRECT_URI || process.env.REDIRECT_URI || 'https://backbase-dev.com/callback';
}

export function getBgCertPem() {
  return readConfiguredFile(
    'BG_CERT_FILE_PATH',
    'BG_CERT_PEM',
    './client_signed_certifcate.crt'
  );
}

export function getBgPrivateKey() {
  return readConfiguredFile(
    'BG_PRIVATE_KEY_PATH',
    'BG_PRIVATE_KEY',
    './bg_client_private.key'
  );
}

export function getBgCreateDefaults() {
  const validUntilDefault = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  return {
    validUntil: validUntilDefault,
    frequencyPerDay: 4,
    recurringIndicator: true,
    redirectPreferred: false
  };
}


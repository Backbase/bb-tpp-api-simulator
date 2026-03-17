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
  const baseTemplate = process.env.BG_BASE_PATH || '/api/{provider_code}/api/berlingroup/v1';
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
    './client_private.key'
  );
}

export function getBgCreateDefaults() {
  const validUntilDefault = process.env.BG_AIS_VALID_UNTIL || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const frequency = Number.parseInt(process.env.BG_AIS_FREQUENCY_PER_DAY || '4', 10);
  const recurring = (process.env.BG_AIS_RECURRING_INDICATOR || 'true').toLowerCase() === 'true';
  const redirectPreferred = (process.env.BG_AIS_REDIRECT_PREFERRED || 'false').toLowerCase() === 'true';
  return {
    validUntil: validUntilDefault,
    frequencyPerDay: Number.isNaN(frequency) ? 4 : frequency,
    recurringIndicator: recurring,
    redirectPreferred
  };
}


/**
 * Berlin Group AIS consent routes.
 */

import express from 'express';
import {
  createConsent,
  getConsent,
  getConsentStatus,
  deleteConsent,
  listAccounts,
  getSingleAccount,
  getAccountTransactions,
  getAccountBalances
} from '../../services/bg/ais-service.js';
import {
  getBgProviderCode,
  getBgRedirectUri,
  getBgCreateDefaults
} from '../../services/bg/shared/config.js';

const router = express.Router();
const BG_AUTHORIZATION_URL_MAX_ATTEMPTS = 10;
const BG_AUTHORIZATION_URL_RETRY_DELAY_MS = 1500;

function defaultAccess() {
  return { balances: [], transactions: [] };
}

function extractDataRequestOptions(req) {
  const consentId = req.query.consentId || req.headers['consent-id'];
  const psuDeviceId = req.headers['psu-device-id'];
  const psuIpAddress = req.headers['psu-ip-address'];
  const psuDeviceName = req.headers['psu-device-name'];
  return { consentId, psuDeviceId, psuIpAddress, psuDeviceName };
}

function ensureConsentId(consentId) {
  if (!consentId) {
    const error = new Error('Missing consentId. Provide it as query param `consentId` or header `Consent-Id`.');
    error.status = 400;
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function resolveAuthorizationUrl(providerCode, consentId) {
  let lastError = null;

  for (let attempt = 1; attempt <= BG_AUTHORIZATION_URL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const showData = await getConsent(providerCode, consentId);
      const authorizationUrl = showData?._links?.scaRedirect?.href;
      if (authorizationUrl) return authorizationUrl;
    } catch (error) {
      lastError = error;
    }

    if (attempt < BG_AUTHORIZATION_URL_MAX_ATTEMPTS) {
      await sleep(BG_AUTHORIZATION_URL_RETRY_DELAY_MS);
    }
  }

  if (lastError) {
    const error = new Error(
      `BG authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts: ${lastError.message}`
    );
    error.status = 504;
    throw error;
  }

  const error = new Error(
    `BG authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts`
  );
  error.status = 504;
  throw error;
}

router.post('/consent', async (req, res, next) => {
  try {
    const defaults = getBgCreateDefaults();
    const {
      providerCode = getBgProviderCode(),
      redirectUri = getBgRedirectUri(),
      recurringIndicator = defaults.recurringIndicator,
      frequencyPerDay = defaults.frequencyPerDay,
      validUntil = defaults.validUntil,
      access = defaultAccess(),
      redirectPreferred = defaults.redirectPreferred
    } = req.body;

    const data = await createConsent({
      providerCode,
      recurringIndicator,
      frequencyPerDay,
      validUntil,
      access,
      redirectPreferred,
      redirectUri
    });

    const consentId = data?.consentId;
    if (!consentId) {
      throw new Error('BG create consent response does not include consentId');
    }

    const authorizationUrl = await resolveAuthorizationUrl(providerCode, consentId);

    res.status(201).json({
      ...data,
      authorizationUrl
    });
  } catch (error) {
    next(error);
  }
});

router.get('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    const data = await getConsent(providerCode, consentId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/consent/:consentId/status', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    const data = await getConsentStatus(providerCode, consentId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    await deleteConsent(providerCode, consentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/accounts', async (req, res, next) => {
  try {
    const { providerCode = getBgProviderCode() } = req.query;
    const options = extractDataRequestOptions(req);
    ensureConsentId(options.consentId);
    const data = await listAccounts(providerCode, options);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/:accountId', async (req, res, next) => {
  try {
    const { providerCode = getBgProviderCode(), withBalance } = req.query;
    const { accountId } = req.params;
    const options = {
      ...extractDataRequestOptions(req),
      withBalance
    };
    ensureConsentId(options.consentId);
    const data = await getSingleAccount(providerCode, accountId, options);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/:accountId/transactions', async (req, res, next) => {
  try {
    const { providerCode = getBgProviderCode(), bookingStatus } = req.query;
    const { accountId } = req.params;
    const options = {
      ...extractDataRequestOptions(req),
      bookingStatus
    };
    ensureConsentId(options.consentId);
    const data = await getAccountTransactions(providerCode, accountId, options);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/:accountId/balances', async (req, res, next) => {
  try {
    const { providerCode = getBgProviderCode() } = req.query;
    const { accountId } = req.params;
    const options = extractDataRequestOptions(req);
    ensureConsentId(options.consentId);
    const data = await getAccountBalances(providerCode, accountId, options);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;


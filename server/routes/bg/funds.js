/**
 * Berlin Group Funds (CBPII/CoF) routes.
 */

import express from 'express';
import {
  createFundsConfirmation,
  getFundsConsent,
  getFundsConsentStatus,
  createFundsConsent,
  deleteFundsConsent,
  getFundsConsentAuthorisation
} from '../../services/bg/funds-service.js';
import {
  getBgProviderCode,
  getBgRedirectUri,
  getBgCreateDefaults
} from '../../services/bg/shared/config.js';

const router = express.Router();
const BG_AUTHORIZATION_URL_MAX_ATTEMPTS = 10;
const BG_AUTHORIZATION_URL_RETRY_DELAY_MS = 1500;

function defaultConsentAccount() {
  return {
    iban: 'XF88148405667533'
  };
}

function defaultConfirmationAccount() {
  return {
    iban: 'XF42663005510913'
  };
}

function defaultInstructedAmount() {
  return {
    currency: 'EUR',
    amount: '100'
  };
}

function ensureConsentId(consentId) {
  if (!consentId) {
    const error = new Error('Missing consentId. Provide it in body, query param `consentId`, or header `Consent-Id`.');
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
      const showData = await getFundsConsent(providerCode, consentId);
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
      `BG COF authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts: ${lastError.message}`
    );
    error.status = 504;
    throw error;
  }

  const error = new Error(
    `BG COF authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts`
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
      redirectPreferred = defaults.redirectPreferred,
      account = defaultConsentAccount()
    } = req.body;

    const data = await createFundsConsent({
      providerCode,
      account,
      redirectPreferred,
      redirectUri
    });

    const consentId = data?.consentId;
    if (!consentId) {
      throw new Error('BG COF create consent response does not include consentId');
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
    const data = await getFundsConsent(providerCode, consentId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/consent/:consentId/status', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    const data = await getFundsConsentStatus(providerCode, consentId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    await deleteFundsConsent(providerCode, consentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/consent/:consentId/authorisations/:authorisationId', async (req, res, next) => {
  try {
    const { consentId, authorisationId } = req.params;
    const { providerCode = getBgProviderCode() } = req.query;
    const data = await getFundsConsentAuthorisation(providerCode, consentId, authorisationId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/confirmations', async (req, res, next) => {
  try {
    const defaults = getBgCreateDefaults();
    const {
      providerCode = getBgProviderCode(),
      consentId = req.query.consentId || req.headers['consent-id'],
      account = defaultConfirmationAccount(),
      instructedAmount = defaultInstructedAmount(),
      redirectPreferred = defaults.redirectPreferred
    } = req.body;

    ensureConsentId(consentId);

    const data = await createFundsConfirmation({
      providerCode,
      consentId,
      account,
      instructedAmount,
      redirectPreferred
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

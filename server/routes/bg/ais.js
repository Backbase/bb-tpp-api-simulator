/**
 * Berlin Group AIS consent routes.
 */

import express from 'express';
import {
  createConsent,
  getConsent,
  getConsentStatus,
  deleteConsent
} from '../../services/bg/ais-service.js';
import {
  getBgProviderCode,
  getBgRedirectUri,
  getBgCreateDefaults
} from '../../services/bg/shared/config.js';

const router = express.Router();

function defaultAccess() {
  return { balances: [], transactions: [] };
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

    res.json(data);
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

export default router;


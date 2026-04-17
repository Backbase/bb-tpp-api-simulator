/**
 * Berlin Group PIS (Payment Initiation Services) routes.
 *
 * Mounts two sub-routers:
 *   /payments/:paymentProduct          — single payments
 *   /periodic-payments/:paymentProduct — periodic (standing-order) payments
 *
 * Supported payment products (passed as :paymentProduct path param):
 *   cross-border-credit-transfers, sepa-credit-transfers,
 *   instant-sepa-credit-transfers, internal-transfer
 */

import express from 'express';
import {
  createPayment,
  getPayment,
  getPaymentStatus,
  getPaymentAuthorisation,
  deletePayment
} from '../../services/bg/pis-service.js';
import {
  getBgProviderCode,
  getBgRedirectUri,
  getBgCreateDefaults
} from '../../services/bg/shared/config.js';

const router = express.Router();
const BG_AUTHORIZATION_URL_MAX_ATTEMPTS = 10;
const BG_AUTHORIZATION_URL_RETRY_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function resolveAuthorizationUrl(providerCode, paymentType, paymentProduct, paymentId) {
  let lastError = null;

  for (let attempt = 1; attempt <= BG_AUTHORIZATION_URL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const showData = await getPayment(providerCode, paymentType, paymentProduct, paymentId);
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
      `BG PIS authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts: ${lastError.message}`
    );
    error.status = 504;
    throw error;
  }

  const error = new Error(
    `BG PIS authorizationUrl not available after ${BG_AUTHORIZATION_URL_MAX_ATTEMPTS} attempts`
  );
  error.status = 504;
  throw error;
}

function createPaymentTypeHandlers(paymentType) {
  const subRouter = express.Router({ mergeParams: true });

  // POST /:paymentProduct — Create payment (+ resolve authorizationUrl)
  subRouter.post('/:paymentProduct', async (req, res, next) => {
    try {
      const defaults = getBgCreateDefaults();
      const { paymentProduct } = req.params;
      const {
        providerCode = getBgProviderCode(),
        redirectUri = getBgRedirectUri(),
        redirectPreferred = defaults.redirectPreferred,
        ...paymentBody
      } = req.body;

      const data = await createPayment({
        providerCode,
        paymentType,
        paymentProduct,
        body: paymentBody,
        redirectPreferred,
        redirectUri
      });

      const paymentId = data?.paymentId ?? data?.periodicPaymentId;
      if (!paymentId) {
        throw new Error(`BG ${paymentType} create response does not include a payment ID`);
      }

      const authorizationUrl = await resolveAuthorizationUrl(
        providerCode, paymentType, paymentProduct, paymentId
      );

      res.status(201).json({ ...data, authorizationUrl });
    } catch (error) {
      next(error);
    }
  });

  // GET /:paymentProduct/:paymentId — Show payment details
  subRouter.get('/:paymentProduct/:paymentId', async (req, res, next) => {
    try {
      const { paymentProduct, paymentId } = req.params;
      const { providerCode = getBgProviderCode() } = req.query;
      const data = await getPayment(providerCode, paymentType, paymentProduct, paymentId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // GET /:paymentProduct/:paymentId/status — Transaction status
  subRouter.get('/:paymentProduct/:paymentId/status', async (req, res, next) => {
    try {
      const { paymentProduct, paymentId } = req.params;
      const { providerCode = getBgProviderCode() } = req.query;
      const data = await getPaymentStatus(providerCode, paymentType, paymentProduct, paymentId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // GET /:paymentProduct/:paymentId/authorisations/:authorisationId — SCA status
  subRouter.get('/:paymentProduct/:paymentId/authorisations/:authorisationId', async (req, res, next) => {
    try {
      const { paymentProduct, paymentId, authorisationId } = req.params;
      const { providerCode = getBgProviderCode() } = req.query;
      const data = await getPaymentAuthorisation(
        providerCode, paymentType, paymentProduct, paymentId, authorisationId
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /:paymentProduct/:paymentId — Revoke / cancel payment
  subRouter.delete('/:paymentProduct/:paymentId', async (req, res, next) => {
    try {
      const { paymentProduct, paymentId } = req.params;
      const defaults = getBgCreateDefaults();
      const {
        providerCode = getBgProviderCode(),
        redirectUri = getBgRedirectUri(),
        redirectPreferred = defaults.redirectPreferred
      } = req.query;

      const { status, data } = await deletePayment({
        providerCode,
        paymentType,
        paymentProduct,
        paymentId,
        redirectPreferred,
        redirectUri
      });
      res.status(status).json(data);
    } catch (error) {
      next(error);
    }
  });

  return subRouter;
}

router.use('/payments', createPaymentTypeHandlers('payments'));
router.use('/periodic-payments', createPaymentTypeHandlers('periodic-payments'));

export default router;

/**
 * UK Open Banking CBPII (Confirmation of Funds) Routes
 * Simplified API routes designed for curl access
 */

import express from 'express';
import {
  createCBPIIConsent,
  getConsentDetails
} from '../../services/uk/cbpii-service.js';

const router = express.Router();

/**
 * POST /api/uk/cbpii/consent
 * Creates a UK CBPII consent and returns the authorization URL.
 *
 * Body:
 * - providerCode (optional, defaults to env)
 * - redirectUri (optional, defaults to env)
 * - expirationDateTime (optional, default: null)
 * - debtorAccount (optional, uses defaults if not provided)
 */
router.post('/consent', async (req, res, next) => {
  try {
    const {
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk',
      redirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback',
      expirationDateTime,
      debtorAccount
    } = req.body;

    console.log('\n📝 Creating UK CBPII consent...');
    console.log(`   Provider: ${providerCode}`);
    console.log(`   Redirect URI: ${redirectUri}`);

    const result = await createCBPIIConsent({
      providerCode,
      redirectUri,
      expirationDateTime,
      debtorAccount
    });

    res.json({
      consentId: result.consentId,
      authorizationUrl: result.authorizationUrl,
      status: result.status
    });
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    next(error);
  }
});

/**
 * GET /api/uk/cbpii/consent/:consentId
 * Get UK CBPII consent details by consent ID.
 *
 * Path params:
 * - consentId (required)
 *
 * Query params:
 * - providerCode (optional, defaults to env)
 */
router.get('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const {
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk'
    } = req.query;

    console.log(`\n🔍 Fetching UK CBPII consent details: ${consentId}...`);
    const consent = await getConsentDetails(providerCode, consentId);

    console.log('✅ UK CBPII consent details retrieved\n');

    res.json({
      success: true,
      data: consent
    });
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    next(error);
  }
});

export default router;

/**
 * UK Open Banking PIS (Payment Initiation Services) Routes
 * Simplified API routes designed for curl access
 */

import express from 'express';
import { 
  createPISConsent,
  getConsentDetails
} from '../../services/uk/pis-service.js';

const router = express.Router();

/**
 * POST /api/uk/pis/consent
 * Creates a UK PIS consent and returns the authorization URL
 * This is the main entry point - one curl command to get started
 * 
 * Body:
 * - providerCode (optional, defaults to env)
 * - redirectUri (optional, defaults to env)
 * - paymentProduct (optional, defaults to 'domestic-payment-consents')
 * - initiation (optional, uses defaults if not provided)
 * - authorisation (optional, uses defaults if not provided)
 * - scaSupportData (optional, uses defaults if not provided)
 * - risk (optional, uses defaults if not provided)
 */
router.post('/consent', async (req, res, next) => {
  try {
    const {
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk',
      redirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback',
      paymentProduct = 'domestic-payment-consents',
      initiation,
      authorisation,
      scaSupportData,
      risk
    } = req.body;

    console.log(`\n📝 Creating UK PIS consent...`);
    console.log(`   Provider: ${providerCode}`);
    console.log(`   Payment Product: ${paymentProduct}`);
    console.log(`   Redirect URI: ${redirectUri}`);

    const result = await createPISConsent({
      providerCode,
      redirectUri,
      paymentProduct,
      initiation,
      authorisation,
      scaSupportData,
      risk
    });

    res.json({
      consentId: result.consentId,
      authorizationUrl: result.authorizationUrl,
      status: result.status,
    });
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    next(error);
  }
});

/**
 * GET /api/uk/pis/consent/:consentId
 * Get UK PIS consent details by consent ID
 * 
 * Path params:
 * - consentId (required)
 * 
 * Query params:
 * - providerCode (optional, defaults to env)
 * - paymentProduct (optional, defaults to 'domestic-payment-consents')
 */
router.get('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { 
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk',
      paymentProduct = 'domestic-payment-consents'
    } = req.query;

    console.log(`\n🔍 Fetching UK PIS consent details: ${consentId}...`);
    console.log(`   Provider: ${providerCode}`);
    console.log(`   Payment Product: ${paymentProduct}`);
    
    const consent = await getConsentDetails(providerCode, consentId, paymentProduct);
    
    console.log(`✅ UK PIS consent details retrieved\n`);

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


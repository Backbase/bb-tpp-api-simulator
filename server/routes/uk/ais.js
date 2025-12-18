/**
 * UK Open Banking AIS (Account Information Services) Routes
 * Simplified API routes designed for curl access
 */

import express from 'express';
import { 
  createAISConsent,
  getConsentDetails,
  revokeAISConsent
} from '../../services/uk/ais-service.js';

const router = express.Router();

/**
 * POST /api/uk/ais/consent
 * Creates a UK AIS consent and returns the authorization URL
 * This is the main entry point - one curl command to get started
 * 
 * Body:
 * - providerCode (optional, defaults to env)
 * - redirectUri (optional, defaults to env)
 * - permissions (optional, uses defaults)
 */
router.post('/consent', async (req, res, next) => {
  try {
    const {
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk',
      redirectUri = process.env.REDIRECT_URI || 'https://backbase-dev.com/callback',
      permissions,
      expirationDateTime
    } = req.body;

    console.log(`\n📝 Creating UK AIS consent...`);
    console.log(`   Provider: ${providerCode}`);
    console.log(`   Redirect URI: ${redirectUri}`);

    const result = await createAISConsent({
      providerCode,
      redirectUri,
      permissions,
      expirationDateTime
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
 * GET /api/uk/ais/consent/:consentId
 * Get UK AIS consent details by consent ID
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

    console.log(`\n🔍 Fetching UK AIS consent details: ${consentId}...`);
    const consent = await getConsentDetails(providerCode, consentId);
    
    console.log(`✅ UK AIS consent details retrieved\n`);

    res.json({
      success: true,
      data: consent
    });
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    next(error);
  }
});

/**
 * DELETE /api/uk/ais/consent/:consentId
 * Revoke/Delete a UK AIS consent by consent ID
 * 
 * Path params:
 * - consentId (required)
 * 
 * Query params:
 * - providerCode (optional, defaults to env)
 */
router.delete('/consent/:consentId', async (req, res, next) => {
  try {
    const { consentId } = req.params;
    const { 
      providerCode = process.env.OB_PROVIDER_CODE || 'backbase_dev_uk'
    } = req.query;

    console.log(`\n🗑️  Revoking UK AIS consent: ${consentId}...`);
    console.log(`   Provider: ${providerCode}`);
    
    await revokeAISConsent(providerCode, consentId);
    
    console.log(`✅ UK AIS consent revoked successfully\n`);

    res.json({
      success: true,
      message: 'Consent revoked successfully',
      consentId
    });
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    next(error);
  }
});

export default router;


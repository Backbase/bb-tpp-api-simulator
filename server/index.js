#!/usr/bin/env node
/**
 * BB TPP API Simulator - Main Server
 * 
 * A curl-friendly API simulator for testing UK Open Banking AIS (Account Information Services) 
 * and PIS (Payment Initiation Services) with SaltEdge.
 * Provides REST API endpoints for creating and managing AIS and PIS consents.
 * No UI - pure REST API interface for automation and testing.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ukAisRouter from './routes/uk/ais.js';
import ukPisRouter from './routes/uk/pis.js';
import ukCbpiiRouter from './routes/uk/cbpii.js';
import bgAisRouter from './routes/bg/ais.js';
import bgFundsRouter from './routes/bg/funds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/uk/ais', ukAisRouter);
app.use('/api/uk/pis', ukPisRouter);
app.use('/api/uk/cbpii', ukCbpiiRouter);
app.use('/api/bg/ais', bgAisRouter);
app.use('/api/bg/funds', bgFundsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'bb-tpp-api-simulator'
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'BB TPP API Simulator',
    description: 'curl-friendly API simulator for Open Banking testing with SaltEdge',
    version: '1.0.0',
    service: 'Open Banking',
    endpoints: {
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint'
      },
      createUKAISConsent: {
        method: 'POST',
        path: '/api/uk/ais/consent',
        description: 'Create UK AIS account access consent and get authorization URL',
        example: 'curl -X POST http://localhost:8080/api/uk/ais/consent -H "Content-Type: application/json" -d "{}"'
      },
      getUKAISConsent: {
        method: 'GET',
        path: '/api/uk/ais/consent/:consentId',
        description: 'Get UK AIS consent details by consent ID',
        example: 'curl "http://localhost:8080/api/uk/ais/consent/CONSENT_ID"'
      },
      revokeUKAISConsent: {
        method: 'DELETE',
        path: '/api/uk/ais/consent/:consentId',
        description: 'Revoke/Delete a UK AIS consent by consent ID',
        example: 'curl -X DELETE "http://localhost:8080/api/uk/ais/consent/CONSENT_ID"'
      },
      createUKPISConsent: {
        method: 'POST',
        path: '/api/uk/pis/consent',
        description: 'Create UK PIS payment consent and get authorization URL',
        example: 'curl -X POST http://localhost:8080/api/uk/pis/consent -H "Content-Type: application/json" -d "{}"'
      },
      getUKPISConsent: {
        method: 'GET',
        path: '/api/uk/pis/consent/:consentId',
        description: 'Get UK PIS consent details by consent ID',
        example: 'curl "http://localhost:8080/api/uk/pis/consent/CONSENT_ID"'
      },
      createUKCBPIIConsent: {
        method: 'POST',
        path: '/api/uk/cbpii/consent',
        description: 'Create UK CBPII funds-confirmation consent and get authorization URL',
        example: 'curl -X POST http://localhost:8080/api/uk/cbpii/consent -H "Content-Type: application/json" -d "{}"'
      },
      getUKCBPIIConsent: {
        method: 'GET',
        path: '/api/uk/cbpii/consent/:consentId',
        description: 'Get UK CBPII consent details by consent ID',
        example: 'curl "http://localhost:8080/api/uk/cbpii/consent/CONSENT_ID"'
      },
      createBGAISConsent: {
        method: 'POST',
        path: '/api/bg/ais/consent',
        description: 'Create Berlin Group AIS consent',
        example: 'curl -X POST http://localhost:8080/api/bg/ais/consent -H "Content-Type: application/json" -d "{}"'
      },
      getBGAISConsent: {
        method: 'GET',
        path: '/api/bg/ais/consent/:consentId',
        description: 'Get Berlin Group AIS consent details by consent ID',
        example: 'curl "http://localhost:8080/api/bg/ais/consent/CONSENT_ID"'
      },
      getBGAISConsentStatus: {
        method: 'GET',
        path: '/api/bg/ais/consent/:consentId/status',
        description: 'Get Berlin Group AIS consent status by consent ID',
        example: 'curl "http://localhost:8080/api/bg/ais/consent/CONSENT_ID/status"'
      },
      deleteBGAISConsent: {
        method: 'DELETE',
        path: '/api/bg/ais/consent/:consentId',
        description: 'Delete Berlin Group AIS consent by consent ID',
        example: 'curl -X DELETE "http://localhost:8080/api/bg/ais/consent/CONSENT_ID"'
      },
      listBGAISAccounts: {
        method: 'GET',
        path: '/api/bg/ais/accounts',
        description: 'List Berlin Group AIS accounts (requires Consent-Id)',
        example: 'curl "http://localhost:8080/api/bg/ais/accounts?consentId=CONSENT_ID"'
      },
      getBGAISSingleAccount: {
        method: 'GET',
        path: '/api/bg/ais/accounts/:accountId',
        description: 'Get a single Berlin Group AIS account by account ID (requires Consent-Id)',
        example: 'curl "http://localhost:8080/api/bg/ais/accounts/ACCOUNT_ID?consentId=CONSENT_ID&withBalance=true"'
      },
      getBGAISAccountTransactions: {
        method: 'GET',
        path: '/api/bg/ais/accounts/:accountId/transactions',
        description: 'Get Berlin Group AIS account transactions (requires Consent-Id)',
        example: 'curl "http://localhost:8080/api/bg/ais/accounts/ACCOUNT_ID/transactions?consentId=CONSENT_ID&bookingStatus=both"'
      },
      getBGAISAccountBalances: {
        method: 'GET',
        path: '/api/bg/ais/accounts/:accountId/balances',
        description: 'Get Berlin Group AIS account balances (requires Consent-Id)',
        example: 'curl "http://localhost:8080/api/bg/ais/accounts/ACCOUNT_ID/balances?consentId=CONSENT_ID"'
      },
      createBGFundsConsent: {
        method: 'POST',
        path: '/api/bg/funds/consent',
        description: 'Create Berlin Group Funds (CBPII/CoF) consent',
        example: 'curl -X POST http://localhost:8080/api/bg/funds/consent -H "Content-Type: application/json" -d "{}"'
      },
      getBGFundsConsent: {
        method: 'GET',
        path: '/api/bg/funds/consent/:consentId',
        description: 'Show Berlin Group Funds consent by consent ID',
        example: 'curl "http://localhost:8080/api/bg/funds/consent/CONSENT_ID"'
      },
      getBGFundsConsentStatus: {
        method: 'GET',
        path: '/api/bg/funds/consent/:consentId/status',
        description: 'Get Berlin Group Funds consent status by consent ID',
        example: 'curl "http://localhost:8080/api/bg/funds/consent/CONSENT_ID/status"'
      },
      deleteBGFundsConsent: {
        method: 'DELETE',
        path: '/api/bg/funds/consent/:consentId',
        description: 'Delete Berlin Group Funds consent by consent ID',
        example: 'curl -X DELETE "http://localhost:8080/api/bg/funds/consent/CONSENT_ID"'
      },
      getBGFundsConsentAuthorisation: {
        method: 'GET',
        path: '/api/bg/funds/consent/:consentId/authorisations/:authorisationId',
        description: 'Get Berlin Group Funds consent authorisation by IDs',
        example: 'curl "http://localhost:8080/api/bg/funds/consent/CONSENT_ID/authorisations/AUTHORISATION_ID"'
      },
      createBGFundsConfirmation: {
        method: 'POST',
        path: '/api/bg/funds/confirmations',
        description: 'Create Berlin Group Funds confirmation (requires Consent-Id)',
        example: 'curl -X POST http://localhost:8080/api/bg/funds/confirmations -H "Content-Type: application/json" -d "{\\"consentId\\":\\"CONSENT_ID\\"}"'
      }
    },
    documentation: 'See README.md for detailed examples and workflow'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: 'Visit / for API documentation'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    details: err.response?.data || err.details || null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Backbase TPP API Simulator - UK + Berlin Group');
  console.log('='.repeat(70));
  console.log(`\n   Server:        http://localhost:${PORT}`);
  console.log(`   Provider:      ${process.env.OB_PROVIDER_CODE || 'Not configured'}`);
  console.log(`   SaltEdge:      ${process.env.PROTOCOL || 'https'}://${process.env.PRIORA_URL || 'priora.saltedge.com'}`);
  console.log(`   Redirect URI:  ${process.env.REDIRECT_URI || 'Not configured'}`);
  console.log(`\n   Documentation: http://localhost:${PORT}`);
  console.log(`   Health Check:  http://localhost:${PORT}/api/health`);
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Ready to accept UK and BG consent requests!\n');
  console.log('Quick Start (Create UK AIS Consent):');
  console.log(`   curl -X POST http://localhost:${PORT}/api/uk/ais/consent -H "Content-Type: application/json" -d "{}"\n`);
  console.log('Quick Start (Create UK PIS Consent):');
  console.log(`   curl -X POST http://localhost:${PORT}/api/uk/pis/consent -H "Content-Type: application/json" -d "{}"\n`);
  console.log('Quick Start (Create UK CBPII Consent):');
  console.log(`   curl -X POST http://localhost:${PORT}/api/uk/cbpii/consent -H "Content-Type: application/json" -d "{}"\n`);
  console.log('Quick Start (Create BG AIS Consent):');
  console.log(`   curl -X POST http://localhost:${PORT}/api/bg/ais/consent -H "Content-Type: application/json" -d "{}"\n`);
  console.log('Quick Start (Create BG Funds Consent):');
  console.log(`   curl -X POST http://localhost:${PORT}/api/bg/funds/consent -H "Content-Type: application/json" -d "{}"\n`);
});

export default app;


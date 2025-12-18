/**
 * UK Open Banking Configuration Utilities
 * Shared configuration functions for UK Open Banking services
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load private key from file or environment variable
 */
export function getPrivateKey() {
  const keyPath = process.env.OB_PRIVATE_KEY_PATH;
  const keyValue = process.env.OB_PRIVATE_KEY;

  if (keyValue && keyValue.includes('BEGIN')) {
    console.log('🔑 Processing private key from environment variable...');
    
    let processedKey = keyValue;
    
    // Handle URL-encoded keys
    try {
      if (keyValue.includes('%')) {
        processedKey = decodeURIComponent(keyValue);
        console.log('   ✓ URL-decoded the key');
      }
    } catch (e) {
      // If decoding fails, continue with original
    }
    
    // Replace escaped newlines with actual newlines (e.g., "\\n" -> "\n")
    if (processedKey.includes('\\n')) {
      processedKey = processedKey.replace(/\\n/g, '\n');
      console.log('   ✓ Replaced escaped newlines (\\\\n)');
    }
    
    // Handle Azure Key Vault format: single line with spaces instead of newlines
    // Key Vault replaces actual newlines with spaces
    // Format: "-----BEGIN PRIVATE KEY----- base64content -----END PRIVATE KEY-----"
    if (processedKey.includes('-----BEGIN') && processedKey.includes('-----END') && 
        !processedKey.includes('\n')) {
      console.log('   ⚠️  Detected single-line key (Key Vault format) - reformatting...');
      
      // Extract the header, content, and footer
      const beginMatch = processedKey.match(/-----BEGIN [A-Z\s]+ KEY-----/);
      const endMatch = processedKey.match(/-----END [A-Z\s]+ KEY-----/);
      
      if (beginMatch && endMatch) {
        const beginMarker = beginMatch[0];
        const endMarker = endMatch[0];
        
        // Get the base64 content between markers
        const startIdx = processedKey.indexOf(beginMarker) + beginMarker.length;
        const endIdx = processedKey.indexOf(endMarker);
        const base64Content = processedKey.substring(startIdx, endIdx).trim();
        
        // Remove all spaces from base64 content
        const cleanBase64 = base64Content.replace(/\s+/g, '');
        
        // Split base64 content into 64-character lines (PEM standard)
        const lines = [beginMarker];
        for (let i = 0; i < cleanBase64.length; i += 64) {
          lines.push(cleanBase64.substring(i, i + 64));
        }
        lines.push(endMarker);
        
        processedKey = lines.join('\n');
        console.log('   ✓ Reformatted key with proper line breaks');
      }
    }
    
    console.log('✅ Private key loaded from environment variable successfully');
    return processedKey;
  }

  if (keyPath) {
    const fullPath = path.isAbsolute(keyPath) 
      ? keyPath 
      : path.join(__dirname, '..', '..', '..', '..', keyPath);
    
    if (fs.existsSync(fullPath)) {
      const key = fs.readFileSync(fullPath, 'utf8');
      console.log('✅ Private key loaded from file successfully');
      return key;
    }
  }

  throw new Error('Private key not configured. Set OB_PRIVATE_KEY or OB_PRIVATE_KEY_PATH in .env');
}

/**
 * Get base URL for SaltEdge Priora
 */
export function getBaseUrl() {
  const protocol = process.env.PROTOCOL || 'https';
  const prioraUrl = process.env.PRIORA_URL || 'priora.saltedge.com';
  return `${protocol}://${prioraUrl}`;
}

/**
 * Get client ID (software ID)
 */
export function getClientId() {
  const clientId = process.env.OB_SOFTWARE_ID;
  if (!clientId) {
    throw new Error('OB_SOFTWARE_ID not configured in .env');
  }
  return clientId;
}


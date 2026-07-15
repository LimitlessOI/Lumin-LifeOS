/**
 * SYNOPSIS: services/canaryTokenService.js
 */
// services/canaryTokenService.js

import crypto from 'crypto';

export function generateCanaryToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function validateToken(token, expectedToken) {
  return token === expectedToken;
}

// Railway Planting Runbook
// 1. Deploy the service on Railway with the appropriate environment variables.
// 2. Ensure the database is properly configured to store canary tokens.
// 3. Use the `generateCanaryToken` function to create new tokens.
// 4. Use the `validateToken` function to verify tokens as needed.
// 5. Regularly review logs and handle any anomalies or issues promptly.

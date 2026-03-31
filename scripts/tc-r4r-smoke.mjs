#!/usr/bin/env node
/**
 * Optional live smoke for R4R routes. Requires a running LifeOS API.
 *
 *   TC_TX_ID=123 BASE_URL=http://localhost:8080 API_KEY=... node scripts/tc-r4r-smoke.mjs
 *
 * Uses x-api-key (or set COMMAND_CENTER_KEY / LIFEOS_KEY — same value as server env).
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TX_ID = process.env.TC_TX_ID || process.env.TC_TRANSACTION_ID || '';
const API_KEY =
  process.env.API_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.COMMAND_CENTER_KEY ||
  '';

async function main() {
  if (!TX_ID) {
    console.error('Set TC_TX_ID (numeric tc_transactions.id)');
    process.exit(1);
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
  };

  const scanRes = await fetch(`${BASE_URL}/api/v1/tc/transactions/${TX_ID}/r4r/scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const scanJson = await scanRes.json().catch(() => ({}));
  console.log('POST r4r/scan:', scanRes.status, JSON.stringify(scanJson, null, 2));

  const testRes = await fetch(`${BASE_URL}/api/v1/tc/transactions/${TX_ID}/r4r/test-reject-all`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ strict_attachment_roles: false }),
  });
  const testJson = await testRes.json().catch(() => ({}));
  console.log('POST r4r/test-reject-all (relaxed):', testRes.status, JSON.stringify(testJson, null, 2));

  if (!scanRes.ok || !testRes.ok) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

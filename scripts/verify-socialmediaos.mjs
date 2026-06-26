/**
 * SYNOPSIS: Exports runAudit — scripts/verify-socialmediaos.mjs.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const DB_MIGRATION_PATH = 'db/migrations/20260626_socialmediaos.sql';
const SERVICE_FILE_PATH = 'services/socialmediaos-service.js';
const ROUTES_FILE_PATH = 'routes/socialmediaos-routes.js';
const API_BASE_PATH = '/api/v1/socialmediaos';

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (e) {
    return `Error reading ${rel}: ${e.message}`;
  }
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: detail || (ok ? 'PASS' : 'FAIL') };
}

function resolveBaseUrl() {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.BUILDER_BASE_URL ||
    process.env.LUMIN_SMOKE_BASE_URL ||
    ''
  ).replace(/\/$/, '');
}

function resolveCommandKey() {
  return (
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    ''
  );
}

async function fetchJson(url, method = 'GET', body = null, commandKey = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(commandKey ? { 'x-command-key': commandKey } : {}),
  };
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const text = await res.text(); // Read as text first
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON, or empty. json remains null.
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (error) {
    return { ok: false, status: 500, json: null, text: error.message };
  }
}

export async function runAudit() {
  const checks = [];
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();

  // --- File Existence Checks ---
  checks.push(check('FILE-01', exists(DB_MIGRATION_PATH), `${DB_MIGRATION_PATH} exists`));
  checks.push(check('FILE-02', exists(SERVICE_FILE_PATH), `${SERVICE_FILE_PATH} exists`));
  checks.push(check('FILE-03', exists(ROUTES_FILE_PATH), `${ROUTES_FILE_PATH} exists`));

  // --- DB Migration Checks ---
  const dbMigrationContent = read(DB_MIGRATION_PATH);
  checks.push(
    check(
      'DB-01',
      dbMigrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_sessions'),
      'Migration includes socialmediaos_sessions table creation'
    )
  );
  checks.push(
    check(
      'DB-02',
      dbMigrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_content_packs'),
      'Migration includes socialmediaos_content_packs table creation'
    )
  );

  // --- Service Export Check ---
  const serviceContent = read(SERVICE_FILE_PATH);
  checks.push(
    check(
      'SVC-01',
      serviceContent.includes('export function createMarketingOSFactory'),
      'Service exports createMarketingOSFactory'
    )
  );

  // --- Route Signature Check ---
  const routesContent = read(ROUTES_FILE_PATH);
  const expectedRouteFactorySignature = 'export function createSocialmediaosRoutes({ pool, requireKey, logger }) {';
  checks.push(
    check(
      'RTE-01',
      routesContent.includes(expectedRouteFactorySignature),
      `Routes file includes exact factory signature: ${expectedRouteFactorySignature}`
    )
  );

  // --- HTTP Probes ---
  if (!baseUrl) {
    checks.push(check('HTTP-00', false, 'PUBLIC_BASE_URL environment variable is not set. Skipping HTTP probes.'));
    return checks;
  }
  if (!commandKey) {
    checks.push(check('HTTP-00', false, 'COMMAND_CENTER_KEY environment variable is not set. Skipping HTTP probes.'));
    return checks;
  }

  // Probe 1: GET /api/v1/socialmediaos/sessions
  const sessionsUrl = `${baseUrl}${API_BASE_PATH}/sessions`;
  const sessionsRes = await fetchJson(sessionsUrl, 'GET', null, commandKey);
  checks.push(
    check(
      'HTTP-01',
      sessionsRes.ok && sessionsRes.status === 200 && sessionsRes.json?.ok === true,
      `GET ${sessionsUrl} -> Status: ${sessionsRes.status}, OK: ${sessionsRes.json?.ok}, Detail: ${sessionsRes.text.substring(0, 100)}`
    )
  );

  // Probe 2: POST /api/v1/socialmediaos/validate-payment-link
  const validateLinkUrl = `${baseUrl}${API_BASE_PATH}/validate-payment-link`;
  const validateLinkBody = { link: 'https://buy.stripe.com/test' };
  const validateLinkRes = await fetchJson(validateLinkUrl, 'POST', validateLinkBody, commandKey);
  const validationResultOk = validateLinkRes.ok && validateLinkRes.status === 200 && validateLinkRes.json?.ok === true;
  const validationContentOk = validateLinkRes.json?.valid === true || validateLinkRes.json?.validationResult?.valid === true;

  checks.push(
    check(
      'HTTP-02',
      validationResultOk && validationContentOk,
      `POST ${validateLinkUrl} -> Status: ${validateLinkRes.status}, OK: ${validateLinkRes.json?.ok}, Valid: ${validateLinkRes.json?.valid || validateLinkRes.json?.validationResult?.valid}, Detail: ${validateLinkRes.text.substring(0, 100)}`
    )
  );

  return checks;
}

async function main() {
  const auditResults = await runAudit();
  let allPassed = true;

  console.log('--- SocialMediaOS Phase 1 Acceptance Script Results ---');
  for (const checkResult of auditResults) {
    const status = checkResult.ok ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${checkResult.id}: ${checkResult.detail}`);
    if (!checkResult.ok) {
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('\nAll SocialMediaOS Phase 1 acceptance checks passed!');
    process.exit(0);
  } else {
    console.error('\nSome SocialMediaOS Phase 1 acceptance checks failed.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('An unexpected error occurred during audit:', err);
    process.exit(1);
  });
}
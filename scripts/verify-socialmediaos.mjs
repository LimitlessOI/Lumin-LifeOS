/**
 * SYNOPSIS: Exports runAudit — scripts/verify-socialmediaos.mjs.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (e) {
    return null;
  }
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: detail || (ok ? 'PASS' : 'FAIL') };
}

function scoreChecks(checks) {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.ok).length;
  return Math.round((passed / checks.length) * 100) / 10;
}

function runNodeCheck(filePath) {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, filePath)], {
    encoding: 'utf8',
  });
  return r.status === 0;
}

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || '';
}

export async function runAudit() {
  const checks = [];
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const apiBase = '/api/v1/socialmediaos';

  // --- Environment Variable Checks ---
  checks.push(
    check('ENV-001', baseUrl, 'PUBLIC_BASE_URL is set'),
    check('ENV-002', commandKey, 'COMMAND_CENTER_KEY is set')
  );

  if (!baseUrl || !commandKey) {
    checks.push(
      check('PROBE-001', false, 'Skipping HTTP probes due to missing PUBLIC_BASE_URL or COMMAND_CENTER_KEY'),
      check('PROBE-002', false, 'Skipping HTTP probes due to missing PUBLIC_BASE_URL or COMMAND_CENTER_KEY')
    );
    return checks;
  }

  // --- DB Migration Presence Check ---
  const dbMigrationPath = 'db/migrations/20260626_socialmediaos.sql';
  const dbMigrationContent = read(dbMigrationPath);
  checks.push(
    check('DB-001', exists(dbMigrationPath), `DB migration file ${dbMigrationPath} exists`)
  );
  if (dbMigrationContent) {
    checks.push(
      check(
        'DB-002',
        dbMigrationContent.includes('CREATE TABLE socialmediaos_sessions'),
        'socialmediaos_sessions table definition found'
      ),
      check(
        'DB-003',
        dbMigrationContent.includes('CREATE TABLE socialmediaos_content_packs'),
        'socialmediaos_content_packs table definition found'
      )
    );
  } else {
    checks.push(
      check('DB-002', false, 'Could not read DB migration file'),
      check('DB-003', false, 'Could not read DB migration file')
    );
  }

  // --- Service Exports Check ---
  const servicePath = 'services/socialmediaos-service.js';
  const serviceContent = read(servicePath);
  checks.push(
    check('SVC-001', exists(servicePath), `Service file ${servicePath} exists`)
  );
  if (serviceContent) {
    checks.push(
      check(
        'SVC-002',
        serviceContent.includes('export function createMarketingOSFactory'),
        'createMarketingOSFactory export found'
      ),
      check(
        'SVC-003',
        runNodeCheck(servicePath),
        `Service file ${servicePath} passes Node --check`
      )
    );
  } else {
    checks.push(
      check('SVC-002', false, 'Could not read service file'),
      check('SVC-003', false, 'Skipped Node --check for service file')
    );
  }

  // --- Route Factory Signature Check ---
  const routesPath = 'routes/socialmediaos-routes.js';
  const routesContent = read(routesPath);
  checks.push(
    check('RTE-001', exists(routesPath), `Routes file ${routesPath} exists`)
  );
  if (routesContent) {
    checks.push(
      check(
        'RTE-002',
        routesContent.includes('export function createSocialmediaosRoutes({ pool, requireKey, logger })'),
        'createSocialmediaosRoutes factory signature found'
      ),
      check(
        'RTE-003',
        runNodeCheck(routesPath),
        `Routes file ${routesPath} passes Node --check`
      )
    );
  } else {
    checks.push(
      check('RTE-002', false, 'Could not read routes file'),
      check('RTE-003', false, 'Skipped Node --check for routes file')
    );
  }

  // --- HTTP Probes ---
  const headers = { 'x-command-key': commandKey, 'Content-Type': 'application/json' };

  // Probe 1: GET /api/v1/socialmediaos/sessions
  const getSessionsUrl = `${baseUrl}${apiBase}/sessions`;
  try {
    const res = await fetch(getSessionsUrl, { headers });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // json remains null if parsing fails
    }

    checks.push(
      check(
        'PROBE-001',
        res.ok && json?.ok === true && Array.isArray(json?.sessions),
        `GET ${apiBase}/sessions: HTTP ${res.status}, ok: ${json?.ok}, sessions array: ${Array.isArray(json?.sessions)}`
      )
    );
  } catch (error) {
    checks.push(
      check('PROBE-001', false, `GET ${apiBase}/sessions failed: ${error.message}`)
    );
  }

  // Probe 2: POST /api/v1/socialmediaos/validate-payment-link
  const validateLinkUrl = `${baseUrl}${apiBase}/validate-payment-link`;
  const postBody = { link: 'https://buy.stripe.com/test' };
  try {
    const res = await fetch(validateLinkUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(postBody),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // json remains null if parsing fails
    }

    checks.push(
      check(
        'PROBE-002',
        res.ok && json?.ok === true && json?.valid === true,
        `POST ${apiBase}/validate-payment-link: HTTP ${res.status}, ok: ${json?.ok}, valid: ${json?.valid}`
      )
    );
  } catch (error) {
    checks.push(
      check('PROBE-002', false, `POST ${apiBase}/validate-payment-link failed: ${error.message}`)
    );
  }

  return checks;
}

async function main() {
  const auditChecks = await runAudit();
  const overallScore = scoreChecks(auditChecks);
  const allOk = auditChecks.every((c) => c.ok);

  const report = {
    schema: 'socialmediaos_phase1_acceptance_report_v1',
    generated_at: new Date().toISOString(),
    overall_score: overallScore,
    ok: allOk,
    checks: auditChecks,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!allOk) {
    console.error('\n--- FAILED CHECKS ---');
    auditChecks.filter((c) => !c.ok).forEach((c) => {
      console.error(`FAIL ${c.id}: ${c.detail}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll SocialMediaOS Phase 1 acceptance checks passed.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('An unhandled error occurred during audit:', err);
  process.exit(1);
});
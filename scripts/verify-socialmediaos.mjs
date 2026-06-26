/**
 * SYNOPSIS: Exports runAudit — scripts/verify-socialmediaos.mjs.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: detail || (ok ? 'PASS' : 'FAIL') };
}

function scoreChecks(checks) {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.ok).length;
  return Math.round((passed / checks.length) * 100) / 10;
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
  return process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

export async function runAudit() {
  const checks = [];
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const apiBase = `${baseUrl}/api/v1/socialmediaos`;

  // --- DB Migration Checks ---
  const migrationPath = 'db/migrations/20260626_socialmediaos.sql';
  if (exists(migrationPath)) {
    const migrationContent = read(migrationPath);
    checks.push(
      check(
        'DB-M01',
        migrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_sessions'),
        'migration includes socialmediaos_sessions table'
      )
    );
    checks.push(
      check(
        'DB-M02',
        migrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_content_packs'),
        'migration includes socialmediaos_content_packs table'
      )
    );
  } else {
    checks.push(check('DB-M01', false, `Migration file not found: ${migrationPath}`));
    checks.push(check('DB-M02', false, `Migration file not found: ${migrationPath}`));
  }

  // --- Service Export Check ---
  const servicePath = 'services/socialmediaos-service.js';
  if (exists(servicePath)) {
    const serviceContent = read(servicePath);
    checks.push(
      check(
        'SVC-E01',
        serviceContent.includes('export function createMarketingOSFactory'),
        'service exports createMarketingOSFactory'
      )
    );
  } else {
    checks.push(check('SVC-E01', false, `Service file not found: ${servicePath}`));
  }

  // --- Route Factory Signature Check ---
  const routesPath = 'routes/socialmediaos-routes.js';
  if (exists(routesPath)) {
    const routesContent = read(routesPath);
    checks.push(
      check(
        'RTE-S01',
        routesContent.includes('export function createSocialmediaosRoutes({ pool, requireKey, logger })'),
        'routes file includes correct factory signature'
      )
    );
  } else {
    checks.push(check('RTE-S01', false, `Routes file not found: ${routesPath}`));
  }

  // --- HTTP Probes ---
  if (!baseUrl || !commandKey) {
    checks.push(check('HTTP-P01', false, 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing - cannot probe'));
    checks.push(check('HTTP-P02', false, 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing - cannot probe'));
  } else {
    const headers = {
      'x-command-key': commandKey,
      'Content-Type': 'application/json',
    };

    // Probe 1: GET /api/v1/socialmediaos/sessions
    try {
      const getSessionsRes = await fetch(`${apiBase}/sessions`, { headers });
      const getSessionsText = await getSessionsRes.text();
      let getSessionsJson = null;
      try {
        getSessionsJson = JSON.parse(getSessionsText);
      } catch (e) {
        // Not valid JSON
      }

      checks.push(
        check(
          'HTTP-P01',
          getSessionsRes.ok && getSessionsJson?.ok === true,
          `GET /sessions: Status ${getSessionsRes.status}, ok: ${getSessionsJson?.ok}`
        )
      );
    } catch (err) {
      checks.push(check('HTTP-P01', false, `GET /sessions failed: ${err.message}`));
    }

    // Probe 2: POST /api/v1/socialmediaos/validate-payment-link
    try {
      const postValidateLinkRes = await fetch(`${apiBase}/validate-payment-link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ link: 'https://buy.stripe.com/test' }),
      });
      const postValidateLinkText = await postValidateLinkRes.text();
      let postValidateLinkJson = null;
      try {
        postValidateLinkJson = JSON.parse(postValidateLinkText);
      } catch (e) {
        // Not valid JSON
      }

      const isValid = postValidateLinkJson?.valid === true || postValidateLinkJson?.validationResult?.valid === true;
      checks.push(
        check(
          'HTTP-P02',
          postValidateLinkRes.ok && postValidateLinkJson?.ok === true && isValid,
          `POST /validate-payment-link: Status ${postValidateLinkRes.status}, ok: ${postValidateLinkJson?.ok}, valid: ${isValid}`
        )
      );
    } catch (err) {
      checks.push(check('HTTP-P02', false, `POST /validate-payment-link failed: ${err.message}`));
    }
  }

  return checks;
}

async function main() {
  const auditChecks = await runAudit();
  const overallScore = scoreChecks(auditChecks);
  const allPassed = auditChecks.every((c) => c.ok);

  const report = {
    schema: 'mos_p1_005_acceptance_report_v1',
    generated_at: new Date().toISOString(),
    checks: auditChecks,
    overall_score: overallScore,
    all_passed: allPassed,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!allPassed) {
    console.error('\n--- FAILED CHECKS ---');
    for (const c of auditChecks.filter((x) => !x.ok)) {
      console.error(`FAIL ${c.id}: ${c.detail}`);
    }
    process.exit(1);
  } else {
    console.log('\nAll acceptance checks passed.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('An unexpected error occurred during audit:');
  console.error(err);
  process.exit(1);
});
#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance test for tc-service product.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 *
 * Checks: all TC service/route files exist + syntax OK, portals exist, route probes.
 * Exit 0 = PASS, exit 1 = FAIL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  'routes/tc-routes.js',
  'routes/tc-r4r-routes.js',
  'services/tc-coordinator.js',
  'services/tc-doc-intake.js',
  'services/tc-pricing.js',
  'services/tc-portal-service.js',
  'services/tc-status-engine.js',
  'services/tc-workflow-service.js',
  'services/tc-automation-service.js',
  'services/tc-communication-callback-service.js',
  'services/tc-morning-digest-service.js',
  'services/tc-email-monitor.js',
  'services/tc-email-document-service.js',
  'services/tc-stripe-service.js',
  'services/tc-report-service.js',
  'services/tc-alert-service.js',
  'services/tc-access-service.js',
  'services/tc-approval-service.js',
  'services/tc-browser-agent.js',
  'services/tc-document-validator.js',
  'services/tc-inspection-service.js',
  'services/tc-inspection-forward-service.js',
  'services/tc-interaction-service.js',
  'services/tc-listing-skyslope-sync.js',
  'services/tc-offer-prep-service.js',
  'services/tc-review-package-service.js',
  'services/tc-webhook-validator.js',
  'services/tc-workflow-specs.js',
  'services/tc-td-workflow-runner.js',
  'services/tc-td-party-sync.js',
  'services/tc-td-form-knowledge-service.js',
  'services/tc-mobile-link-service.js',
  'services/tc-asana-sync-service.js',
  'services/tc-assistant-service.js',
  'services/tc-feed-ingest-service.js',
  'services/tc-intake-workspace-service.js',
  'services/tc-pdf-signature-stamp.js',
  'services/tc-r4r-attachment-classify.js',
  'services/mls-deal-scanner.js',
  'services/glvar-monitor.js',
  'services/email-triage.js',
  'public/tc/agent-portal.html',
  'public/tc/client-portal.html',
];

const BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  ''
).replace(/\/$/, '');

const CMD_KEY = process.env.COMMAND_CENTER_KEY || '';

const fails = [];
let passes = 0;

function pass(msg) { passes++; console.log(`PASS ${msg}`); }
function fail(msg) { fails.push(msg); console.log(`FAIL ${msg}`); }

for (const f of REQUIRED_FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { fail(`Missing: ${f}`); continue; }
  if (f.endsWith('.js')) {
    try {
      execSync(`node -c "${abs}"`, { encoding: 'utf8', stdio: 'pipe' });
      pass(`${f} exists + syntax OK`);
    } catch { fail(`${f} syntax error`); }
  } else {
    pass(`${f} exists`);
  }
}

if (BASE_URL && CMD_KEY) {
  const routes = [
    { method: 'GET', path: '/api/v1/tc/health' },
    { method: 'GET', path: '/api/v1/tc/pricing/tiers' },
  ];
  for (const r of routes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`, {
        method: r.method,
        headers: { 'x-command-key': CMD_KEY },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status < 500) {
        pass(`${r.method} ${r.path} → ${res.status}`);
      } else {
        fail(`${r.method} ${r.path} → ${res.status}`);
      }
    } catch (e) {
      fail(`${r.method} ${r.path} → ${e.message}`);
    }
  }
} else {
  console.log('SKIP route probes (no BASE_URL or CMD_KEY)');
}

console.log(`\nResults: ${passes} passed, ${fails.length} failed of ${REQUIRED_FILES.length} files`);
if (fails.length) {
  console.error('FAILURES:', fails.join('; '));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);

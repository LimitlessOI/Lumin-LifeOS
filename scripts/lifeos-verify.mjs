#!/usr/bin/env node
/**
 * scripts/lifeos-verify.mjs
 *
 * Quick diagnostic that verifies the LifeOS installation is healthy.
 * Checks env vars, migration files, service files, and route files.
 *
 * Usage:
 *   node scripts/lifeos-verify.mjs
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── ANSI colors ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
};

const PASS = `${C.green}✓${C.reset}`;
const FAIL = `${C.red}✗${C.reset}`;

// ── Check lists ───────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'COMMAND_CENTER_KEY',
];

const AI_PROVIDER_KEYS = [
  'ANTHROPIC_API_KEY',
  'GOOGLE_AI_KEY',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
];

const REQUIRED_MIGRATIONS = [
  '20260328_lifeos_core.sql',
  '20260328_lifeos_notifications.sql',
  '20260328_lifeos_truth_delivery.sql',
  '20260329_lifeos_community.sql',
  '20260329_lifeos_decisions.sql',
  '20260329_lifeos_engine.sql',
  '20260329_lifeos_growth.sql',
  '20260329_lifeos_identity.sql',
  '20260329_lifeos_vision.sql',
  '20260330_lifeos_health.sql',
  '20260330_lifeos_victory_vault.sql',
  '20260331_lifeos_family.sql',
  '20260401_lifeos_emotional.sql',
  '20260402_lifeos_purpose.sql',
  '20260403_lifeos_children.sql',
  '20260404_lifeos_data_ethics.sql',
  '20260405_lifeos_mediation.sql',
  '20260406_lifeos_conflict.sql',
  '20260406b_lifeos_conflict_clarity.sql',
  '20260407_communication_profile.sql',
  '20260407_response_variety.sql',
  '20260408_lifeos_finance_and_prefs.sql',
];

const REQUIRED_SERVICES = [
  'core/lifeos-twin-bridge.js',
  'services/chatgpt-import.js',
  'services/child-learning-engine.js',
  'services/commitment-tracker.js',
  'services/communication-coach.js',
  'services/communication-gateway.js',
  'services/communication-profile.js',
  'services/community-growth.js',
  'services/conflict-intelligence.js',
  'services/consent-registry.js',
  'services/constitutional-lock.js',
  'services/contradiction-engine.js',
  'services/data-sovereignty.js',
  'services/decision-intelligence.js',
  'services/dream-builder-child.js',
  'services/dream-funding.js',
  'services/emotional-pattern-engine.js',
  'services/emergency-detection.js',
  'services/fulfillment-engine.js',
  'services/future-vision.js',
  'services/health-extensions.js',
  'services/health-pattern-engine.js',
  'services/healthkit-bridge.js',
  'services/household-sync.js',
  'services/inner-work-effectiveness.js',
  'services/integrity-score.js',
  'services/joy-score.js',
  'services/lifeos-finance.js',
  'services/lifeos-notification-router.js',
  'services/lifeos-scheduled-jobs.js',
  'services/lumin-memory-fetcher.js',
  'services/mastery-tracker.js',
  'services/medical-context-generator.js',
  'services/mediation-engine.js',
  'services/memory-healing.js',
  'services/multi-person-sync.js',
  'services/outreach-engine.js',
  'services/parenting-coach.js',
  'services/purpose-discovery.js',
  'services/relationship-debrief.js',
  'services/relationship-intelligence.js',
  'services/research-aggregator.js',
  'services/response-variety.js',
  'services/sovereignty-check.js',
  'services/tone-intelligence.js',
  'services/truth-delivery.js',
  'services/twin-auto-ingest.js',
  'services/video-production.js',
  'services/victory-vault.js',
];

const REQUIRED_ROUTES = [
  'routes/lifeos-conflict-routes.js',
  'routes/lifeos-core-routes.js',
  'routes/lifeos-decisions-routes.js',
  'routes/lifeos-engine-routes.js',
  'routes/lifeos-growth-routes.js',
  'routes/lifeos-health-routes.js',
  'routes/lifeos-family-routes.js',
  'routes/lifeos-identity-routes.js',
  'routes/lifeos-mediation-routes.js',
  'routes/lifeos-purpose-routes.js',
  'routes/lifeos-children-routes.js',
  'routes/lifeos-ethics-routes.js',
  'routes/lifeos-emotional-routes.js',
  'routes/lifeos-vision-routes.js',
  'routes/lifeos-healing-routes.js',
  'routes/lifeos-legacy-routes.js',
  'routes/lifeos-finance-routes.js',
];

const SYNTAX_CHECKS = [
  ...REQUIRED_SERVICES,
  ...REQUIRED_ROUTES,
  'startup/register-runtime-routes.js',
  'startup/boot-domains.js',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function checkPass(label) {
  console.log(`  ${PASS} ${label}`);
  passed++;
}

function checkFail(label, detail = '') {
  const msg = detail ? `${C.red}${label}${C.reset}  ${C.dim}${detail}${C.reset}` : `${C.red}${label}${C.reset}`;
  console.log(`  ${FAIL} ${msg}`);
  failures.push(label + (detail ? ` — ${detail}` : ''));
  failed++;
}

function section(title) {
  console.log(`\n${C.bold}${title}${C.reset}`);
}

// ── 1. NODE_ENV ───────────────────────────────────────────────────────────────

section('Environment');
const nodeEnv = process.env.NODE_ENV || '(not set)';
console.log(`  ${C.dim}NODE_ENV:${C.reset} ${C.cyan}${nodeEnv}${C.reset}`);
passed++; // reporting only — not a pass/fail gate

// ── 2. Required env vars ──────────────────────────────────────────────────────

section('Required environment variables');
for (const varName of REQUIRED_ENV_VARS) {
  const val = process.env[varName];
  if (val && val.trim().length > 0) {
    checkPass(`${varName} is set`);
  } else {
    checkFail(varName, 'not set or empty');
  }
}

const configuredAiProviders = AI_PROVIDER_KEYS.filter((varName) => process.env[varName]?.trim());
if (configuredAiProviders.length > 0) {
  checkPass(`AI provider key available (${configuredAiProviders.join(', ')})`);
} else {
  checkFail('AI provider key', `set one of: ${AI_PROVIDER_KEYS.join(', ')}`);
}

// ── 3. Migration files ────────────────────────────────────────────────────────

section('Migration files (db/migrations/)');
for (const filename of REQUIRED_MIGRATIONS) {
  const absPath = path.join(ROOT, 'db', 'migrations', filename);
  if (fs.existsSync(absPath)) {
    checkPass(filename);
  } else {
    checkFail(filename, 'NOT FOUND');
  }
}

// ── 4. Service files ──────────────────────────────────────────────────────────

section('Service files');
for (const relPath of REQUIRED_SERVICES) {
  const absPath = path.join(ROOT, relPath);
  if (fs.existsSync(absPath)) {
    checkPass(relPath);
  } else {
    checkFail(relPath, 'NOT FOUND');
  }
}

// ── 5. Route files ────────────────────────────────────────────────────────────

section('Route files');
for (const relPath of REQUIRED_ROUTES) {
  const absPath = path.join(ROOT, relPath);
  if (fs.existsSync(absPath)) {
    checkPass(relPath);
  } else {
    checkFail(relPath, 'NOT FOUND');
  }
}

// ── 6. Syntax checks ─────────────────────────────────────────────────────────

section('Syntax checks');
for (const relPath of SYNTAX_CHECKS) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    checkFail(relPath, 'missing for syntax check');
    continue;
  }
  const result = spawnSync(process.execPath, ['--check', absPath], { encoding: 'utf8' });
  if (result.status === 0) {
    checkPass(relPath);
  } else {
    const detail = (result.stderr || result.stdout || 'node --check failed').trim().split('\n')[0];
    checkFail(relPath, detail);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${C.dim}${'─'.repeat(55)}${C.reset}`);
console.log(`${C.bold}Result:${C.reset} ${passed}/${total} checks passed`);

if (failed === 0) {
  console.log(`${C.green}${C.bold}✔  ALL CHECKS PASSED${C.reset}\n`);
} else {
  console.log(`${C.red}${C.bold}✘  ${failed} CHECK(S) FAILED${C.reset}`);
  console.log(`\n${C.bold}Failures:${C.reset}`);
  for (const f of failures) {
    console.log(`  ${FAIL} ${f}`);
  }
  console.log();
}

process.exit(failed === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * scripts/verify-project.mjs
 * Project verifier — reads a manifest JSON, runs all assertions, writes
 * pass/fail to the DB live state, outputs a clean terminal report.
 *
 * Usage:
 *   node scripts/verify-project.mjs --project command_center
 *   node scripts/verify-project.mjs --all
 *   node scripts/verify-project.mjs --dry-run --all   (no DB writes)
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const projectArg = args[args.indexOf('--project') + 1] || null;
const runAll = args.includes('--all');
const dryRun = args.includes('--dry-run');
const quiet = args.includes('--quiet');

if (!projectArg && !runAll) {
  console.error('Usage: node scripts/verify-project.mjs --project <id> | --all [--dry-run] [--quiet]');
  process.exit(1);
}

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};
const pass = `${C.green}✓${C.reset}`;
const fail = `${C.red}✗${C.reset}`;
const warn = `${C.yellow}⚠${C.reset}`;

function log(...args) { if (!quiet) console.log(...args); }

// ── Load DB pool (optional — skip if no DATABASE_URL) ─────────────────────────
let pool = null;
async function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  try {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    return pool;
  } catch { return null; }
}

// ── Load .env if present ──────────────────────────────────────────────────────
try {
  const envPath = path.join(ROOT, '.env');
  const envContent = await fs.readFile(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* no .env, that's fine */ }

// ── Find all manifests ─────────────────────────────────────────────────────────
async function findManifests() {
  const docsDir = path.join(ROOT, 'docs', 'projects');
  const files = await fs.readdir(docsDir);
  return files
    .filter(f => f.endsWith('.manifest.json'))
    .map(f => path.join(docsDir, f));
}

async function loadManifest(manifestPath) {
  const content = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(content);
}

// ── Assertion runners ──────────────────────────────────────────────────────────
async function runAssertion(assertion, manifest) {
  const { type, check, expect } = assertion;

  switch (type) {
    case 'env': {
      const val = process.env[check];
      const ok = expect === 'present' ? !!val : val === expect;
      return { ok, detail: ok ? `${check} is set` : `${check} is missing or wrong` };
    }

    case 'file_exists': {
      try {
        await fs.access(path.join(ROOT, check));
        return { ok: true, detail: `${check} exists` };
      } catch {
        return { ok: false, detail: `${check} does not exist` };
      }
    }

    case 'route': {
      // Live route check against Railway if PUBLIC_BASE_URL set, else skip
      const base = process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
      if (!base) return { ok: null, detail: 'skipped — no PUBLIC_BASE_URL set', skipped: true };
      try {
        const url = `${base.replace(/\/$/, '')}${check}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const ok = resp.status === (expect || 200);
        return { ok, detail: `${check} → ${resp.status} (expected ${expect || 200})` };
      } catch (e) {
        return { ok: false, detail: `${check} → fetch failed: ${e.message}` };
      }
    }

    case 'table_exists': {
      const db = await getPool();
      if (!db) return { ok: null, detail: 'skipped — no DB connection', skipped: true };
      try {
        const res = await db.query(
          `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`, [check]
        );
        const exists = parseInt(res.rows[0].count) > 0;
        return { ok: exists, detail: exists ? `table ${check} exists` : `table ${check} missing` };
      } catch (e) {
        return { ok: false, detail: `DB check failed: ${e.message}` };
      }
    }

    case 'table_columns': {
      const db = await getPool();
      if (!db) return { ok: null, detail: 'skipped — no DB connection', skipped: true };
      try {
        const res = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [check]
        );
        const cols = res.rows.map(r => r.column_name);
        const required = Array.isArray(expect) ? expect : [expect];
        const missing = required.filter(c => !cols.includes(c));
        const ok = missing.length === 0;
        return { ok, detail: ok ? `all columns present on ${check}` : `missing columns on ${check}: ${missing.join(', ')}` };
      } catch (e) {
        return { ok: false, detail: `column check failed: ${e.message}` };
      }
    }

    case 'no_circular_deps': {
      try {
        execSync(`npx madge --circular ${path.join(ROOT, check)}`, { stdio: 'pipe' });
        return { ok: true, detail: `no circular deps in ${check}` };
      } catch (e) {
        const out = e.stdout?.toString() || e.stderr?.toString() || '';
        return { ok: false, detail: `circular deps found in ${check}: ${out.slice(0, 120)}` };
      }
    }

    case 'node_check': {
      try {
        execSync(`node --check ${path.join(ROOT, check)}`, { stdio: 'pipe' });
        return { ok: true, detail: `${check} syntax OK` };
      } catch (e) {
        return { ok: false, detail: `${check} syntax error: ${e.stderr?.toString().slice(0, 120)}` };
      }
    }

    case 'required_files': {
      const files = Array.isArray(check) ? check : [check];
      const missing = [];
      for (const f of files) {
        try { await fs.access(path.join(ROOT, f)); } catch { missing.push(f); }
      }
      return {
        ok: missing.length === 0,
        detail: missing.length === 0 ? 'all required files present' : `missing: ${missing.join(', ')}`
      };
    }

    default:
      return { ok: null, detail: `unknown assertion type: ${type}`, skipped: true };
  }
}

// ── Verify one project ─────────────────────────────────────────────────────────
async function verifyProject(manifestPath) {
  let manifest;
  try {
    manifest = await loadManifest(manifestPath);
  } catch (e) {
    log(`${fail} Failed to load manifest: ${manifestPath}\n   ${e.message}`);
    return { passed: false, total: 0, failed: 1, skipped: 0 };
  }

  const { project_id, name, assertions = [], required_env = [], required_files = [], required_tables = [] } = manifest;

  log(`\n${C.bold}${C.cyan}▶ ${name || project_id}${C.reset} ${C.dim}(${project_id})${C.reset}`);
  log(`${C.dim}  manifest: ${path.relative(ROOT, manifestPath)}${C.reset}`);

  // Build full assertion list from manifest fields + explicit assertions
  const allAssertions = [];

  // Required env vars
  for (const envKey of required_env) {
    allAssertions.push({ type: 'env', check: envKey, expect: 'present', label: `env: ${envKey}` });
  }

  // Required files
  if (required_files.length > 0) {
    allAssertions.push({ type: 'required_files', check: required_files, label: 'required files' });
  }

  // Required tables
  for (const t of required_tables) {
    allAssertions.push({ type: 'table_exists', check: t.name, label: `table: ${t.name}` });
    if (t.required_columns?.length) {
      allAssertions.push({ type: 'table_columns', check: t.name, expect: t.required_columns, label: `columns: ${t.name}` });
    }
  }

  // Required routes
  for (const r of (manifest.required_routes || [])) {
    allAssertions.push({ type: 'route', check: r.path, expect: r.expected_status || 200, label: `route: ${r.method} ${r.path}` });
  }

  // Explicit assertions from manifest
  for (const a of assertions) {
    allAssertions.push({ ...a, label: a.label || `${a.type}: ${a.check}` });
  }

  let passed = 0, failed = 0, skipped = 0;
  const results = [];

  for (const assertion of allAssertions) {
    const result = await runAssertion(assertion, manifest);
    const label = assertion.label || `${assertion.type}: ${assertion.check}`;

    if (result.skipped || result.ok === null) {
      log(`  ${warn} ${label} ${C.dim}(${result.detail})${C.reset}`);
      skipped++;
    } else if (result.ok) {
      log(`  ${pass} ${label} ${C.dim}— ${result.detail}${C.reset}`);
      passed++;
    } else {
      log(`  ${fail} ${C.red}${label}${C.reset} — ${result.detail}`);
      failed++;
    }
    results.push({ assertion: label, ok: result.ok, detail: result.detail, skipped: !!result.skipped });
  }

  const allPassed = failed === 0;
  const summary = allPassed
    ? `${C.green}PASS${C.reset} (${passed} checks, ${skipped} skipped)`
    : `${C.red}FAIL${C.reset} (${passed} passed, ${failed} failed, ${skipped} skipped)`;

  log(`  ${C.dim}─────────────────────────${C.reset}`);
  log(`  Result: ${summary}`);

  // Write to DB
  if (!dryRun) {
    const db = await getPool();
    if (db) {
      try {
        await db.query(`
          UPDATE projects
          SET last_verified_at = NOW(), verification_passed = $1
          WHERE slug = $2
        `, [allPassed, project_id]);
      } catch { /* table may not exist yet in this environment */ }
    }
  }

  return { passed, failed, skipped, allPassed, project_id, name };
}

// ── Main ──────────────────────────────────────────────────────────────────────
log(`\n${C.bold}SSOT Project Verifier${C.reset} ${dryRun ? C.yellow + '[DRY RUN]' + C.reset : ''}`);
log(`${C.dim}${'─'.repeat(50)}${C.reset}`);

let manifests = [];
if (runAll) {
  manifests = await findManifests();
  if (manifests.length === 0) {
    log(`${warn} No manifests found in docs/projects/`);
    process.exit(0);
  }
} else {
  // Find by project_id
  const all = await findManifests();
  for (const m of all) {
    try {
      const data = JSON.parse(await fs.readFile(m, 'utf8'));
      if (data.project_id === projectArg) { manifests = [m]; break; }
    } catch { continue; }
  }
  if (manifests.length === 0) {
    // Try direct path
    const direct = path.join(ROOT, 'docs', 'projects', `${projectArg}.manifest.json`);
    try { await fs.access(direct); manifests = [direct]; } catch {
      console.error(`${fail} No manifest found for project: ${projectArg}`);
      process.exit(1);
    }
  }
}

let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
const summaries = [];

for (const m of manifests) {
  const r = await verifyProject(m);
  totalPassed += r.passed;
  totalFailed += r.failed;
  totalSkipped += r.skipped;
  summaries.push(r);
}

// Final summary
log(`\n${C.bold}${'═'.repeat(50)}${C.reset}`);
log(`${C.bold}Summary${C.reset}: ${manifests.length} project(s) verified`);
log(`  ${C.green}Passed${C.reset}:  ${totalPassed} checks`);
log(`  ${C.red}Failed${C.reset}:  ${totalFailed} checks`);
log(`  ${C.yellow}Skipped${C.reset}: ${totalSkipped} checks`);

if (summaries.length > 1) {
  log('');
  for (const s of summaries) {
    const icon = s.allPassed ? pass : fail;
    log(`  ${icon} ${s.name || s.project_id}`);
  }
}

const overallPass = totalFailed === 0;
log(`\n${overallPass ? C.green + '✔ ALL CHECKS PASSED' : C.red + '✘ FAILURES DETECTED'}${C.reset}\n`);

if (pool) await pool.end().catch(() => {});
process.exit(overallPass ? 0 : 1);

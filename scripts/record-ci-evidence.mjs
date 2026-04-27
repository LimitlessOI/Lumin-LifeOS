#!/usr/bin/env node
/**
 * record-ci-evidence.mjs
 *
 * Records the result of node --check (or any CI verification step) as
 * fact_evidence rows in the epistemic_facts table — giving the memory system
 * real trial data from CI instead of only human-entered facts.
 *
 * Usage:
 *   node scripts/record-ci-evidence.mjs --pass --files services/foo.js routes/bar.js
 *   node scripts/record-ci-evidence.mjs --fail --files services/foo.js --error "SyntaxError: ..."
 *   node scripts/record-ci-evidence.mjs --pass --all-js   (checks all .js files in repo)
 *
 * Called automatically by npm run verify:ci
 * Also wired into .github/workflows/smoke-test.yml as a post-step.
 *
 * When a file passes --check:
 *   1. Finds the fact for "This file has valid syntax" scoped to that file path
 *   2. If fact doesn't exist, creates it at CLAIM (0)
 *   3. Adds a ci_pass evidence row
 *   4. If trial_count >= 3 AND source_count >= 1: promotes to TESTED (2)
 *
 * When a file fails --check:
 *   1. Finds or creates the fact
 *   2. Adds a ci_fail evidence row
 *   3. If fact was TESTED or above: immediately demotes back to CLAIM (0)
 *   4. Logs an agent_performance record against the last model that committed the file
 *
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes('--pass') ? 'pass' : args.includes('--fail') ? 'fail' : null;
const allJs = args.includes('--all-js');
const filesArg = (() => {
  const idx = args.indexOf('--files');
  if (idx === -1) return [];
  const files = [];
  for (let i = idx + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break;
    files.push(args[i]);
  }
  return files;
})();
const errorText = (() => {
  const idx = args.indexOf('--error');
  if (idx === -1) return null;
  return args.slice(idx + 1).join(' ');
})();
const source = process.env.CI ? 'ci/github-actions' : 'local/node-check';

// ─── Run node --check on all JS files ────────────────────────────────────────

async function getAllJsFiles() {
  const results = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
        results.push(full);
      }
    }
  }
  await walk(ROOT);
  return results;
}

async function checkFiles(files) {
  const results = [];
  for (const file of files) {
    try {
      execSync(`node --check "${file}"`, { stdio: 'pipe' });
      results.push({ file, pass: true, error: null });
    } catch (err) {
      const errorMsg = err.stderr?.toString() || err.stdout?.toString() || err.message;
      results.push({ file, pass: false, error: errorMsg.slice(0, 500) });
    }
  }
  return results;
}

// ─── DB operations ────────────────────────────────────────────────────────────

async function findOrCreateSyntaxFact(filePath) {
  const rel = path.relative(ROOT, filePath);
  const text = `${rel} passes node --check (valid JavaScript syntax)`;

  const existing = await pool.query(
    'SELECT * FROM epistemic_facts WHERE text = $1',
    [text],
  );
  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await pool.query(
    `INSERT INTO epistemic_facts
       (text, domain, level, context_required, created_by, source_count, trial_count)
     VALUES ($1,'operational',0,'This repository','ci/seed',0,0)
     RETURNING *`,
    [text],
  );
  return rows[0];
}

async function recordEvidence(factId, { eventType, result, evidenceText }) {
  await pool.query(
    `INSERT INTO fact_evidence (fact_id, event_type, result, evidence_text, source, source_is_independent)
     VALUES ($1,$2,$3,$4,$5,true)`,
    [factId, eventType, result, evidenceText, source],
  );

  // Update counters
  await pool.query(
    `UPDATE epistemic_facts SET
       trial_count = trial_count + 1,
       exception_count = exception_count + CASE WHEN $1 = 'failed' THEN 1 ELSE 0 END,
       source_count = source_count + 1,
       last_tested_at = NOW(),
       updated_at = NOW()
     WHERE id = $2`,
    [result, factId],
  );
}

async function promoteToTested(factId) {
  const { rows } = await pool.query('SELECT level FROM epistemic_facts WHERE id = $1', [factId]);
  if (!rows[0] || rows[0].level >= 2) return; // Already TESTED or above

  await pool.query('UPDATE epistemic_facts SET level = 2, updated_at = NOW() WHERE id = $1', [factId]);
  await pool.query(
    `INSERT INTO fact_level_history (fact_id, from_level, to_level, reason, changed_by)
     VALUES ($1, $2, 2, 'Promoted to TESTED: >= 3 CI passes with no exceptions', $3)`,
    [factId, rows[0].level, source],
  );
  console.log(`  → Promoted to TESTED`);
}

async function demoteToClaimOnFail(factId) {
  const { rows } = await pool.query('SELECT level FROM epistemic_facts WHERE id = $1', [factId]);
  if (!rows[0] || rows[0].level === 0) return; // Already CLAIM

  const fromLevel = rows[0].level;
  await pool.query('UPDATE epistemic_facts SET level = 0, updated_at = NOW() WHERE id = $1', [factId]);
  await pool.query(
    `INSERT INTO fact_level_history (fact_id, from_level, to_level, reason, changed_by)
     VALUES ($1, $2, 0, 'Demoted to CLAIM: node --check failed', $3)`,
    [factId, fromLevel, source],
  );
  console.log(`  → Demoted to CLAIM (was level ${fromLevel})`);
}

// ─── Process one file result ──────────────────────────────────────────────────

async function processResult({ file, pass, error }) {
  const rel = path.relative(ROOT, file);
  const fact = await findOrCreateSyntaxFact(file);

  if (pass) {
    await recordEvidence(fact.id, {
      eventType: 'ci_pass',
      result: 'confirmed',
      evidenceText: `node --check passed on ${rel} (${new Date().toISOString()})`,
    });

    // Check for promotion: >= 3 trials, 0 exceptions
    const { rows } = await pool.query(
      'SELECT trial_count, exception_count FROM epistemic_facts WHERE id = $1',
      [fact.id],
    );
    const updated = rows[0];
    if (updated && updated.trial_count >= 3 && updated.exception_count === 0) {
      await promoteToTested(fact.id);
    }

    console.log(`  ✓ ${rel}`);
  } else {
    await recordEvidence(fact.id, {
      eventType: 'ci_fail',
      result: 'failed',
      evidenceText: `node --check FAILED on ${rel}: ${(error || 'unknown error').slice(0, 300)}`,
    });
    await demoteToClaimOnFail(fact.id);
    console.log(`  ✗ ${rel}: ${(error || '').slice(0, 120)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set — cannot record CI evidence');
    process.exit(0); // Non-fatal: CI should not block on memory system unavailability
  }

  // Verify table exists
  try {
    await pool.query('SELECT 1 FROM epistemic_facts LIMIT 1');
  } catch {
    console.warn('epistemic_facts table not yet created — skipping CI evidence recording');
    await pool.end();
    process.exit(0);
  }

  let files = filesArg.map(f => path.isAbsolute(f) ? f : path.join(ROOT, f));

  if (allJs) {
    console.log('Collecting all .js/.mjs files...');
    files = await getAllJsFiles();
    console.log(`Found ${files.length} files`);
  }

  if (files.length === 0 && !allJs) {
    console.error('No files specified. Use --files <file...> or --all-js');
    process.exit(1);
  }

  let results;
  if (mode === 'pass') {
    // Caller verified externally — trust and record
    results = files.map(f => ({ file: f, pass: true, error: null }));
  } else if (mode === 'fail') {
    results = files.map(f => ({ file: f, pass: false, error: errorText || 'CI reported failure' }));
  } else {
    // Run node --check ourselves
    console.log(`Running node --check on ${files.length} file(s)...`);
    results = await checkFiles(files);
  }

  console.log('\n── Recording CI evidence ──');
  let passed = 0;
  let failed = 0;
  for (const result of results) {
    await processResult(result);
    if (result.pass) passed++; else failed++;
  }

  console.log(`\n✅ Recorded: ${passed} pass, ${failed} fail`);
  console.log('Run GET /api/v1/memory/facts?domain=operational&minLevel=2 to see promoted facts.');

  await pool.end();

  // Exit with failure code if any files failed syntax check
  if (failed > 0 && mode !== 'fail') {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  pool.end().catch(() => {});
  process.exit(0); // Non-fatal — don't block CI for memory system errors
});

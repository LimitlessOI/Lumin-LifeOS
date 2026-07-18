/**
 * SYNOPSIS: Detective for false-DONE BUILD_QUEUE steps — re-audits every `done`
 * step's declared artifact against the live tree and classifies failures.
 * Closes the gap where a `done` step is terminal and never re-verified, so a
 * false-done (missing file / broken import) persists on main and breaks CI/boot
 * with no self-heal.
 *
 * Tiers (by severity):
 *   HARD  = target_file missing OR its module fails to import (assertion_threw on
 *           exports_smoke). These actually break `verify`/`syntax-check`/boot.
 *   SOFT  = file exists & imports, but a declared file_contains / expected export
 *           substring is absent (loose/stale assertion — drift, not breakage).
 *
 * Modes:
 *   (default)         report all; exit 1 if any HARD exists (full fail-closed).
 *   `--ci`            RATCHET for CI: load the grandfathered baseline and exit 1
 *                     ONLY on HARD false-dones NOT in the baseline (regressions).
 *                     This is the guard that catches the exact class that slipped
 *                     in before (a `done` step whose artifact never landed) at PR
 *                     time, without blocking on the pre-existing debt.
 *   `--baseline-write` snapshot the current HARD set to the baseline file.
 *   `--fix`           flip HARD false-dones back to `pending` (+ receipt) so the
 *                     governed factory rebuilds them. SOFT never auto-flipped.
 *   `--include-soft`  also count SOFT as failures (stricter cleanup pass).
 *   `--product=<id>`  scope to one product.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateStepExpectations } from '../services/product-build-orchestrator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');
const BASELINE_PATH = path.join(ROOT, 'data/false-done-baseline.json');
const FIX = process.argv.includes('--fix');
const CI = process.argv.includes('--ci');
const BASELINE_WRITE = process.argv.includes('--baseline-write');
const INCLUDE_SOFT = process.argv.includes('--include-soft');
const ONLY = process.argv.find((a) => a.startsWith('--product='))?.split('=')[1] || null;

const keyOf = (product, rec) => `${product}::${rec.id}::${rec.target_file}`;

function loadBaseline() {
  try {
    const b = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    return new Set(b.grandfathered_hard || []);
  } catch {
    return new Set();
  }
}

function listProductQueues() {
  let ids = [];
  try {
    ids = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  return ids
    .filter((id) => !ONLY || id === ONLY)
    .map((id) => ({ id, queuePath: path.join(PRODUCTS_DIR, id, 'BUILD_QUEUE.json') }))
    .filter((p) => fs.existsSync(p.queuePath));
}

function classify(step, reason) {
  const target = String(step.target_file || '');
  const abs = target ? path.join(ROOT, target) : null;
  // MISSING_FILE — the artifact never landed / was deleted. Unambiguous false-done
  // for ANY target type. This is what breaks imports + boot (e.g. a route importing
  // a service whose `done` step never produced the file).
  if (!target || !fs.existsSync(abs)) return 'MISSING_FILE';
  // IMPORT_BROKE — a JS module that exists but fails to load or lacks a declared
  // export. Only meaningful for importable code; `assertion_threw` on a .sql/.html
  // target is a wrong-assertion-type artifact, NOT a broken file → treat as SOFT.
  const isJs = /\.(js|mjs|cjs)$/i.test(target);
  const importBroke = /assertion_threw|reaudit_threw|missing_exports/i.test(reason);
  if (isJs && importBroke) return 'IMPORT_BROKE';
  return 'SOFT'; // content drift, or non-JS assertion noise — do not auto-flip
}

async function auditQueue(queuePath) {
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const steps = Array.isArray(queue.steps) ? queue.steps : [];
  const hard = [];
  const soft = [];
  for (const step of steps) {
    if (step.status !== 'done') continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root: ROOT });
    } catch (err) {
      proof = { ok: false, applicable: true, reason: `reaudit_threw: ${err.message}` };
    }
    if (proof.applicable === false) continue;
    if (proof.ok) continue;
    const tier = classify(step, proof.reason);
    const rec = { id: step.id, target_file: step.target_file, reason: proof.reason, tier };
    (tier === 'SOFT' ? soft : hard).push(rec);
  }
  return { queue, hard, soft };
}

function flip(queue, records, now = new Date().toISOString()) {
  const ids = new Set(records.map((r) => r.id));
  for (const step of queue.steps) {
    if (!ids.has(step.id)) continue;
    step.status = 'pending';
    step.shipped_via = null;
    step.pre_existing = false;
    step.last_error = `false_done_reaudit: ${records.find((r) => r.id === step.id).reason}`.slice(0, 800);
    step.reaudit_reset_at = now;
  }
}

async function main() {
  const queues = listProductQueues();
  const out = [];
  const hardKeys = new Set();
  let hardTotal = 0;
  let softTotal = 0;
  let missingTotal = 0;
  let brokeTotal = 0;
  for (const { id, queuePath } of queues) {
    let res;
    try {
      res = await auditQueue(queuePath);
    } catch (err) {
      console.error(`WARN  ${id}: could not audit — ${err.message}`);
      continue;
    }
    if (!res.hard.length && !res.soft.length) continue;
    hardTotal += res.hard.length;
    softTotal += res.soft.length;
    for (const f of res.hard) {
      hardKeys.add(keyOf(id, f));
      if (f.tier === 'MISSING_FILE') missingTotal += 1; else brokeTotal += 1;
    }
    out.push({ product: id, queuePath, hard: res.hard, soft: res.soft });
    if (FIX && res.hard.length) {
      flip(res.queue, res.hard);
      fs.writeFileSync(queuePath, `${JSON.stringify(res.queue, null, 2)}\n`);
    }
  }

  if (BASELINE_WRITE) {
    const payload = {
      schema: 'false_done_baseline_v1',
      note: 'Grandfathered HARD false-dones (missing artifact / broken import) that pre-date the re-audit guard. The --ci ratchet fails only on HARD keys NOT listed here. Remove keys as they are rebuilt; never add new ones by hand.',
      generated_at: new Date().toISOString(),
      count: hardKeys.size,
      grandfathered_hard: [...hardKeys].sort(),
    };
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`📌 baseline written: ${hardKeys.size} grandfathered HARD false-done(s) → ${path.relative(ROOT, BASELINE_PATH)}`);
    process.exit(0);
  }

  for (const r of out) {
    if (r.hard.length) {
      console.error(`\nHARD  ${r.product}:`);
      for (const f of r.hard) console.error(`    - [${f.tier}] ${f.id} → ${f.target_file}: ${f.reason}`);
    }
  }
  for (const r of out) {
    if (r.soft.length) {
      console.warn(`\nSOFT  ${r.product}: ${r.soft.length} content-drift (file exists+imports; declared substring/assertion not met)`);
      for (const f of r.soft) console.warn(`    - ${f.id} → ${f.target_file}: ${f.reason}`);
    }
  }

  console.log(`\nfalse-done audit summary: HARD=${hardTotal} (MISSING_FILE=${missingTotal} IMPORT_BROKE=${brokeTotal}) SOFT=${softTotal}`);

  if (FIX) {
    if (hardTotal) console.log(`🔧 --fix: flipped ${hardTotal} HARD false-done(s) to pending (factory will rebuild).`);
    process.exit(0);
  }

  if (CI) {
    const baseline = loadBaseline();
    const regressions = [...hardKeys].filter((k) => !baseline.has(k)).sort();
    const fixed = [...baseline].filter((k) => !hardKeys.has(k));
    if (fixed.length) {
      console.log(`\nℹ️  ${fixed.length} baseline false-done(s) no longer HARD — trim them from the baseline when convenient.`);
    }
    if (regressions.length) {
      console.error(`\n❌ RATCHET FAIL: ${regressions.length} NEW HARD false-done(s) not in baseline:`);
      for (const k of regressions) console.error(`    - ${k}`);
      console.error('\nA `done` step shipped without its artifact. Build the artifact via the governed factory, or reset the step to pending (--fix).');
      process.exit(1);
    }
    console.log(`\n✅ ratchet: no NEW false-dones beyond the ${baseline.size} grandfathered.`);
    process.exit(0);
  }

  const fail = hardTotal > 0 || (INCLUDE_SOFT && softTotal > 0);
  if (fail) {
    console.error('\nFAIL: false-done steps detected. Run with --fix to reset HARD ones to pending.');
    process.exit(1);
  }
  console.log('✅ no HARD false-done steps.');
  process.exit(0);
}

main();
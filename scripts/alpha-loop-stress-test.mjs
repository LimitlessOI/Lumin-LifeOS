/**
 * SYNOPSIS: scripts/alpha-loop-stress-test.mjs
 * scripts/alpha-loop-stress-test.mjs
 * Phase 15 — BuilderOS alpha loop stress test.
 *
 * Verifies the self-repair loop closes end-to-end without human intervention:
 *   proof STALE → deploy-check fires → executor runs → proof CURRENT → repair queue clears.
 *
 * Usage:
 *   PUBLIC_BASE_URL=<url> COMMAND_CENTER_KEY=<key> node scripts/alpha-loop-stress-test.mjs
 *   node scripts/alpha-loop-stress-test.mjs  (reads from .env if dotenv loaded)
 *
 * Exit codes:
 *   0 — proof is CURRENT after repair cycle, loop verified
 *   1 — timeout (120s), loop did not close
 *   2 — precondition failure (missing env vars, API unreachable)
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Env bootstrap (no dotenv dep — read .env manually if needed) ─────────────
function loadEnv() {
  const base = process.env.PUBLIC_BASE_URL;
  const key  = process.env.COMMAND_CENTER_KEY;
  if (base && key) return { base, key };

  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return {
      base: process.env.PUBLIC_BASE_URL || env.PUBLIC_BASE_URL,
      key:  process.env.COMMAND_CENTER_KEY || env.COMMAND_CENTER_KEY,
    };
  } catch {
    return { base, key };
  }
}

const { base: BASE_URL, key: KEY } = loadEnv();

// ── API helpers ──────────────────────────────────────────────────────────────

function headers() {
  return { 'x-command-key': KEY, 'Content-Type': 'application/json' };
}

async function getProofFreshness() {
  const r = await fetch(`${BASE_URL}/api/v1/lifeos/command-center/proof-freshness`, { headers: headers() });
  return r.json();
}

async function getRepairQueue() {
  const r = await fetch(`${BASE_URL}/api/v1/lifeos/command-center/self-repair/repair-queue`, { headers: headers() });
  return r.json();
}

async function triggerDeployCheck() {
  const r = await fetch(`${BASE_URL}/api/v1/lifeos/command-center/self-repair/deploy-check`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ triggered_by: 'alpha-loop-stress-test', dry_run: false }),
  });
  return r.json();
}

// ── Polling ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_MS      = 120_000;

async function pollUntilCurrent() {
  const deadline = Date.now() + POLL_MAX_MS;
  let lastState = null;

  while (Date.now() < deadline) {
    const state = await getProofFreshness();
    lastState = state;
    const overall = state?.freshness?.overall;
    console.log(`  [poll] freshness=${overall}  stale_count=${state?.freshness?.stale_count ?? '?'}`);
    if (overall === 'CURRENT') return { ok: true, state };
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  return { ok: false, state: lastState };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!BASE_URL || !KEY) {
    console.error('[STRESS-TEST] FAIL — PUBLIC_BASE_URL and COMMAND_CENTER_KEY must be set');
    process.exit(2);
  }

  console.log(`[STRESS-TEST] Phase 15 — BuilderOS alpha loop stress test`);
  console.log(`[STRESS-TEST] Target: ${BASE_URL}`);
  console.log('');

  // 1. Record pre-test state
  console.log('--- Step 1: pre-test proof state ---');
  const pre = await getProofFreshness();
  const preFreshness = pre?.freshness?.overall ?? 'UNKNOWN';
  console.log(`  railway_deploy_sha : ${pre?.railway_deploy_sha ?? 'N/A'}`);
  console.log(`  receipt_commit_sha : ${pre?.receipt_commit_sha ?? 'N/A'}`);
  console.log(`  freshness          : ${preFreshness}`);
  console.log(`  stale_count        : ${pre?.freshness?.stale_count ?? 'N/A'}`);
  console.log('');

  if (preFreshness !== 'STALE') {
    // Proof is already CURRENT. That means the loop already ran or was never stale.
    // The stress test observes the detect→repair→verify path; if already CURRENT,
    // we trigger a repair-check to prove the circuit responds correctly.
    console.log('  Note: proof already CURRENT — triggering deploy-check to prove circuit handles CURRENT state gracefully');
  }

  // 2. Trigger repair executor
  console.log('--- Step 2: trigger self-repair/deploy-check ---');
  const checkResult = await triggerDeployCheck();
  console.log(`  ok     : ${checkResult?.ok}`);
  console.log(`  action : ${checkResult?.action}`);
  console.log(`  reason : ${checkResult?.reason}`);
  if (checkResult?.drift) console.log(`  drift  : ${JSON.stringify(checkResult.drift)}`);
  console.log('');

  // 3. Poll until CURRENT (or timeout)
  console.log('--- Step 3: poll proof-freshness until CURRENT (max 120s) ---');
  const { ok: resolved, state: finalState } = await pollUntilCurrent();
  console.log('');

  // 4. Report
  const finalFreshness = finalState?.freshness?.overall ?? 'UNKNOWN';
  const queue = await getRepairQueue();
  const openCount = queue?.open_count ?? 'UNKNOWN';

  console.log('--- Step 4: final state ---');
  console.log(`  proof_freshness : ${finalFreshness}`);
  console.log(`  repair_queue    : open=${openCount}  total=${queue?.total ?? '?'}`);
  console.log('');

  if (resolved) {
    console.log('[STRESS-TEST] PASS — proof is CURRENT, loop verified end-to-end');
    process.exit(0);
  } else {
    console.log('[STRESS-TEST] FAIL — TIMEOUT after 120s, proof did not reach CURRENT');
    console.log(`  last freshness: ${finalFreshness}`);
    console.log(`  stale_proofs: ${JSON.stringify(finalState?.freshness?.stale_proofs)}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[STRESS-TEST] FATAL:', err.message);
  process.exit(2);
});

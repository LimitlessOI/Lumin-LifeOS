#!/usr/bin/env node
/**
 * SYNOPSIS: A→Z deliberation governance smoke — factory local + optional Railway API.
 * A→Z deliberation governance smoke — factory local + optional Railway API.
 * Usage: npm run lifeos:deliberation:a-to-z-smoke
 * Env: PUBLIC_BASE_URL + COMMAND_CENTER_KEY for API leg (optional)
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runFactoryDeliberationPipeline,
} from '../factory-staging/factory-core/deliberation/seed-mission-deliberation.js';
import { validateDeliberationGate } from '../factory-staging/factory-core/deliberation/validate-deliberation-gate.js';
import { runBpbIntakeGate } from '../factory-staging/factory-core/bpb/intake-gate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_MISSION = process.env.DELIB_SMOKE_MISSION || 'FACTORY-REBOOT-0003';
const SESSION = `mission:${TEST_MISSION}`;

let failed = 0;
function ok(label, cond) {
  if (cond) console.log(`OK: ${label}`);
  else {
    console.error(`FAIL: ${label}`);
    failed += 1;
  }
}

console.log('=== A→Z Deliberation Smoke v2.7 ===');
console.log('Note: default path validates non-load-bearing minimum (Hist+CFO).');
console.log('Load-bearing + consensus fail-closed: npm run lifeos:deliberation:behavior\n');

const verify = spawnSync('node', ['scripts/verify-deliberation-governance.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
ok('validation script exit 0', verify.status === 0);

console.log('\n--- Factory local pipeline ---');
const pipeline = runFactoryDeliberationPipeline(TEST_MISSION, {
  case_text: 'A→Z smoke test — deliberation seeded for factory mission.',
});
ok('factory pipeline seed', pipeline.ok);
ok('factory gate pass', pipeline.gate?.ok);

const gate2 = validateDeliberationGate(SESSION);
ok('validateDeliberationGate after seed', gate2.ok);

const intake = runBpbIntakeGate(TEST_MISSION, { session_id: SESSION, skip_if_missing: false });
console.log('BPB intake status:', intake.status, intake.violations?.length ? intake.violations : '');
ok('BPB intake deliberation leg clean', !(intake.violations || []).some((v) => v.startsWith('delib:')));

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key =
  process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;

if (base && key) {
  console.log('\n--- Railway API pipeline ---');
  const apiSession = `a-to-z-smoke-${Date.now()}`;
  const headers = { 'Content-Type': 'application/json', 'x-command-key': key };

  async function api(path, opts = {}) {
    const res = await fetch(`${base}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  const seed = await api('/api/v1/lifeos/deliberation/pipeline/seed', {
    method: 'POST',
    body: JSON.stringify({
      session_id: apiSession,
      objective_id: 'SMOKE-OBJ-001',
      project_slug: 'LifeOS',
      case_text: 'API A→Z smoke seed',
    }),
  });
  ok('API pipeline/seed', seed.status === 201 && seed.body.ok);

  const gate = await api(`/api/v1/lifeos/deliberation/gate/${encodeURIComponent(apiSession)}`);
  ok('API gate status pass', gate.body.pass === true);

  const fin = await api('/api/v1/lifeos/deliberation/pipeline/finalize', {
    method: 'POST',
    body: JSON.stringify({
      session_id: apiSession,
      mission_id: TEST_MISSION,
      scorecard: { decision_type: 'smoke', model_count: 2, partial: true, notes: 'A→Z smoke' },
    }),
  });
  ok('API pipeline/finalize', fin.status === 200 && fin.body.ok);

  const debrief = await api(`/api/v1/lifeos/deliberation/debrief/${encodeURIComponent(apiSession)}`);
  const synopsis =
    debrief.body.layer1_synopsis || debrief.body.debrief?.layer1_synopsis || '';
  ok('API debrief generated', debrief.body.ok && synopsis.includes('Founder Debrief'));

  const repSync = await api('/api/v1/lifeos/deliberation/reps/sync', { method: 'POST' });
  ok('API reps/sync', repSync.body.ok);
} else {
  console.log('\nSKIP: PUBLIC_BASE_URL + COMMAND_CENTER_KEY — API leg omitted');
}

console.log(`\n=== Done (${failed} failures) ===`);
process.exit(failed ? 1 : 0);

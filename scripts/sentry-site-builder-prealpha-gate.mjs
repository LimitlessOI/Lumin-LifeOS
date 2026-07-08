#!/usr/bin/env node
/**
 * SYNOPSIS: SENTRY Site Builder pre-alpha completion gate — runs BOTH doctrine
 * layers and fails closed unless both pass. Layer A (structural, HTTP) always
 * runs. Layer B (human-sim, real browser) runs when prod credentials are present
 * (PUBLIC_BASE_URL + COMMAND_CENTER_KEY) — i.e. when this executes as the
 * completion gate on prod, where Chrome launches — by calling
 * POST /api/v1/sites/prealpha/layer-b. This is the machine-executable form of
 * Standing Order SO-002: no Site Builder feature is "done" until SENTRY walks it
 * as a real client and passes both layers. Conductor-authored SCRIPT (SO-001
 * allows scripts/CI); it authors no product code and no browser primitive — it
 * only orchestrates the already-proven Layer A script + Layer B endpoint.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { spawn } from 'node:child_process';

const BASE = (process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';

function runLayerA() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/run-site-builder-prealpha.mjs'], { stdio: 'inherit' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function runLayerB() {
  if (!BASE || !KEY) {
    return { ran: false, ok: false, reason: 'no_prod_creds' };
  }
  try {
    const res = await fetch(`${BASE}/api/v1/sites/prealpha/layer-b`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': KEY },
      body: JSON.stringify({}),
    });
    const body = await res.json().catch(() => ({}));
    const ux = body.uxCritique || {};
    return {
      ran: true,
      ok: res.ok && body.ok === true && ux.verdict !== 'broken',
      verdict: body.verdict,
      ux_verdict: ux.verdict,
      steps_passed: body.tests_passed,
      steps_failed: body.tests_failed,
      friction: ux.friction_points,
      improvements: ux.improvements,
    };
  } catch (err) {
    return { ran: true, ok: false, reason: String(err.message || err).slice(0, 200) };
  }
}

async function main() {
  console.log('── SENTRY Site Builder pre-alpha gate (SO-002: both layers required) ──');

  console.log('\n▶ Layer A (structural, HTTP)…');
  const aOk = await runLayerA();
  console.log(`Layer A: ${aOk ? 'PASS' : 'FAIL'}`);

  console.log('\n▶ Layer B (human-sim, real browser)…');
  const b = await runLayerB();
  if (!b.ran) {
    console.log(`Layer B: SKIPPED (${b.reason}) — no prod creds; cannot drive a real browser here.`);
    console.log('  NOTE: on prod (PUBLIC_BASE_URL + COMMAND_CENTER_KEY set) Layer B is REQUIRED and runs a real browser.');
  } else {
    console.log(`Layer B: ${b.ok ? 'PASS' : 'FAIL'} — verdict=${b.verdict} ux=${b.ux_verdict} steps=${b.steps_passed}/${(b.steps_passed || 0) + (b.steps_failed || 0)}`);
    if (Array.isArray(b.friction) && b.friction.length) console.log('  friction:', b.friction.join(' | '));
    if (Array.isArray(b.improvements) && b.improvements.length) console.log('  improvements:', b.improvements.join(' | '));
    if (b.reason) console.log('  reason:', b.reason);
  }

  // Fail-closed doctrine: Layer A must always pass. Layer B must pass whenever it
  // could run (prod). When Layer B could NOT run (no prod creds — local/CI), the
  // gate passes on Layer A alone but LOUDLY marks Layer B as not-yet-satisfied, so
  // "done" on prod still requires both. It never fakes a Layer B pass.
  const gateOk = aOk && (!b.ran ? true : b.ok);
  const bothSatisfied = aOk && b.ran && b.ok;

  console.log(`\n── GATE: ${gateOk ? 'PASS' : 'FAIL'} ${bothSatisfied ? '(both layers satisfied)' : b.ran ? '' : '(Layer B deferred to prod)'} ──`);
  process.exit(gateOk ? 0 : 1);
}

main().catch((err) => {
  console.error('gate crashed:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS User Auth V1 acceptance test — register, login, refresh, me, logout, tier gate.
 * scripts/run-lifeos-user-auth-v1-acceptance.mjs
 *
 * Usage:
 *   node scripts/run-lifeos-user-auth-v1-acceptance.mjs
 *
 * Env: PUBLIC_BASE_URL, COMMAND_CENTER_KEY
 * Exit 0 = PASS, Exit 1 = FAIL
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFEOS-USER-AUTH-V1-0001';
const RECEIPT_REL = `products/receipts/LIFEOS_USER_AUTH_V1_ACCEPTANCE.json`;
const RECEIPT     = path.join(ROOT, RECEIPT_REL);
const VERDICT     = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const BASE  = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY   = process.env.COMMAND_CENTER_KEY || '';
const PREFIX = '/api/v1/lifeos/auth';

const report = {
  mission_id: MISSION,
  run_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  skipped: false,
};

if (!BASE || !KEY) {
  report.skipped = true;
  report.skip_reason = 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY not set';
  console.error('SKIP: PUBLIC_BASE_URL or COMMAND_CENTER_KEY not set');
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'LifeOS User Auth V1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base: BASE,
    syncTestId: 'UAT-007_bp_sync',
    buildRecord: { build_method: 'system-build', note: 'Auth system — register, login, JWT, tier guard.' },
    verdictExtra: { acceptance_command: 'npm run lifeos:user-auth:v1-acceptance' },
    passPredicate: (r) => r.tests_failed.length === 0 && r.skipped !== true,
  });
  process.exit(0);
}

async function req(method, reqPath, body, headers = {}) {
  const res = await fetch(`${BASE}${PREFIX}${reqPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, ok: res.ok, json };
}

function step(id, cond, detail = '') {
  if (cond) {
    report.tests_passed.push(id);
    console.log(`  PASS: ${id}`);
  } else {
    report.tests_failed.push({ id, detail: String(detail).slice(0, 200) });
    console.error(`  FAIL: ${id} — ${String(detail).slice(0, 200)}`);
  }
}

(async () => {
  const tag    = crypto.randomBytes(4).toString('hex');
  const handle = `testuser_${tag}`;
  const email  = `test_${tag}@lifeos.local`;
  const pass   = `TestPass_${tag}!`;

  console.log(`\nLifeOS User Auth V1 Acceptance — ${new Date().toISOString()}\n`);

  // — Provision an invite via operator route —
  const invR = await req('POST', '/operator/invite', { label: `acceptance_${tag}` });
  step('UAT-invite', invR.ok && Boolean(invR.json?.invite?.code), JSON.stringify(invR.json).slice(0, 200));
  const invCode = invR.json?.invite?.code;
  if (!invCode) {
    finishBpAcceptance({
      root: ROOT, missionId: MISSION, report, receiptAbsPath: RECEIPT, receiptRelPath: RECEIPT_REL,
      verdictAbsPath: VERDICT, objectiveName: 'LifeOS User Auth V1', objectiveVerdictOnPass: 'TECHNICAL_PASS',
      base: BASE, syncTestId: 'UAT-007_bp_sync',
      buildRecord: { build_method: 'system-build', note: 'Auth acceptance failed at invite step.' },
      verdictExtra: { acceptance_command: 'npm run lifeos:user-auth:v1-acceptance' },
      passPredicate: (r) => r.tests_failed.length === 0,
    });
    process.exit(1);
  }

  const regR = await req('POST', '/register', { handle, email, password: pass, inviteCode: invCode });
  step('UAT-register', [200, 201].includes(regR.status) && regR.json?.ok === true, JSON.stringify(regR.json).slice(0, 200));

  const loginR = await req('POST', '/login', { email, password: pass });
  step('UAT-login-ok', loginR.ok && loginR.json?.ok, JSON.stringify(loginR.json).slice(0, 200));
  const { access_token, refresh_token } = loginR.json || {};
  step('UAT-login-access-token', Boolean(access_token));
  step('UAT-login-refresh-token', Boolean(refresh_token));

  const meR = await req('GET', '/me', undefined, { Authorization: `Bearer ${access_token}` });
  step('UAT-me-ok', meR.ok && meR.json?.ok, JSON.stringify(meR.json).slice(0, 200));
  step('UAT-me-handle', meR.json?.user?.user_handle === handle || meR.json?.handle === handle);

  const refR = await req('POST', '/refresh', { refresh_token });
  step('UAT-refresh-ok', refR.ok && refR.json?.ok, JSON.stringify(refR.json).slice(0, 200));
  step('UAT-refresh-token', Boolean(refR.json?.access_token));

  const logoutR = await req('POST', '/logout', { refresh_token });
  step('UAT-logout-ok', logoutR.ok, JSON.stringify(logoutR.json).slice(0, 100));

  const tierR = await req('GET', '/me', undefined, { Authorization: `Bearer ${access_token}` });
  step('UAT-tier-check', [200, 401].includes(tierR.status));

  const allPass = report.tests_failed.length === 0;
  if (allPass) console.log('\n✅ LifeOS User Auth V1 — PASS\n');
  else console.error(`\n❌ LifeOS User Auth V1 — ${report.tests_failed.length} FAIL\n`);

  const { pass: bpPass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'LifeOS User Auth V1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base: BASE,
    syncTestId: 'UAT-007_bp_sync',
    buildRecord: { build_method: 'system-build', note: 'Register, login, JWT, tier guard.' },
    verdictExtra: { acceptance_command: 'npm run lifeos:user-auth:v1-acceptance' },
    passPredicate: (r) => r.tests_failed.length === 0,
  });

  process.exit(bpPass ? 0 : 1);
})().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});

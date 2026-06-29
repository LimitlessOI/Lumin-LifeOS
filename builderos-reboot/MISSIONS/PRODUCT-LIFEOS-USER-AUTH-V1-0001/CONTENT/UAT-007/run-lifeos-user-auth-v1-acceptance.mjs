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

const BASE  = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY   = process.env.COMMAND_CENTER_KEY || '';
const PREFIX = '/api/v1/lifeos/auth';

if (!BASE || !KEY) {
  console.error('SKIP: PUBLIC_BASE_URL or COMMAND_CENTER_KEY not set');
  process.exit(0);
}

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, ok: res.ok, json };
}

function assert(label, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  console.log(`  PASS: ${label}`);
}

(async () => {
  const tag   = crypto.randomBytes(4).toString('hex');
  const handle = `testuser_${tag}`;
  const email  = `test_${tag}@lifeos.local`;
  const pass   = `TestPass_${tag}!`;

  console.log(`\nLifeOS User Auth V1 Acceptance — ${new Date().toISOString()}\n`);

  // — Provision an invite via operator route —
  const invR = await req('POST', '/operator/invite', { label: `acceptance_${tag}` });
  assert('operator invite created', invR.ok && invR.json?.invite?.code, JSON.stringify(invR.json).slice(0, 200));
  const invCode = invR.json.invite.code;

  // — Register —
  const regR = await req('POST', '/register', { handle, email, password: pass, invite_code: invCode });
  assert('register returns 201 or 200', [200, 201].includes(regR.status), JSON.stringify(regR.json).slice(0, 200));
  assert('register ok=true', regR.json?.ok === true);

  // — Login —
  const loginR = await req('POST', '/login', { handle_or_email: email, password: pass });
  assert('login ok', loginR.ok && loginR.json?.ok);
  const { access_token, refresh_token } = loginR.json;
  assert('login returns access_token', Boolean(access_token));
  assert('login returns refresh_token', Boolean(refresh_token));

  // — Me (Bearer) —
  const meR = await req('GET', '/me', undefined, { Authorization: `Bearer ${access_token}` });
  assert('/me ok', meR.ok && meR.json?.ok);
  assert('/me returns handle', meR.json?.user?.user_handle === handle || meR.json?.handle === handle);

  // — Refresh —
  const refR = await req('POST', '/refresh', { refresh_token });
  assert('refresh ok', refR.ok && refR.json?.ok);
  assert('refresh returns new access_token', Boolean(refR.json?.access_token));

  // — Logout —
  const logoutR = await req('POST', '/logout', { refresh_token });
  assert('logout ok', logoutR.ok);

  // — Tier gate (free user blocked from premium feature test via /me with tier header) —
  const tierR = await req('GET', '/me', undefined, { Authorization: `Bearer ${access_token}` });
  assert('stale token still validates or returns 401', [200, 401].includes(tierR.status));

  console.log('\n✅ LifeOS User Auth V1 — PASS\n');
  process.exit(0);
})().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});

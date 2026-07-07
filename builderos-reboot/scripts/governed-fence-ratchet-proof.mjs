/**
 * SYNOPSIS: Offline proof of the governed-fence enable-only ratchet
 * (routes/governed-fence-routes.js). No network, no Railway calls. Proves the
 * separation-of-powers guarantee: the system can ENABLE its own governance fence
 * but any attempt to DISABLE it via the API is rejected (403) BEFORE any Railway
 * mutation is attempted. Chair receipt LIFERE_COUNCIL_1783462353983.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { registerGovernedFenceRoutes } from '../../routes/governed-fence-routes.js';

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); console.log('  PASS ', msg); passed++; };

// Capture the POST /enable handler without touching Railway.
function mountAndGetEnableHandler() {
  const handlers = {};
  const app = {
    get: () => {},
    post: (path, _auth, fn) => { handlers[path] = fn; },
  };
  registerGovernedFenceRoutes(app, { requireKey: (_q, _s, n) => n && n(), logger: { info() {}, error() {} } });
  return handlers['/api/v1/factory/governance/fence/enable'];
}

function fakeRes() {
  return {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(body) { this._json = body; return this; },
  };
}

const enable = mountAndGetEnableHandler();
ok(typeof enable === 'function', 'enable handler is mounted');

// A DISABLE attempt (value:"0") must be rejected 403 with the ratchet reason,
// and must NOT reach Railway — we prove this by leaving RAILWAY_TOKEN unset:
// if the handler tried to call Railway it would throw a different (500) error.
delete process.env.RAILWAY_TOKEN;
for (const bad of ['0', 'false', 'off', 'no', '']) {
  const res = fakeRes();
  await enable({ body: { value: bad } }, res);
  ok(res._status === 403, `disable attempt value=${JSON.stringify(bad)} → 403 (never reaches Railway)`);
  ok(/enable_only_ratchet/.test(res._json?.error || ''), `  ...rejected with enable_only_ratchet reason`);
}

// An ENABLE attempt with missing Railway config fails CLOSED at the config check
// (500 "missing RAILWAY_*"), proving it passed the ratchet but still cannot act
// without real infra creds — i.e. it does not silently pretend to succeed.
{
  process.env.RAILWAY_PROJECT_ID = '';
  const res = fakeRes();
  await enable({ body: { value: '1' } }, res);
  ok(res._status === 500 && /missing RAILWAY_/.test(res._json?.error || ''),
    'enable with no RAILWAY ids → 500 missing-config (passes ratchet, fails closed, no fake success)');
}

console.log(`\n=== ${passed} passed, 0 failed ===`);

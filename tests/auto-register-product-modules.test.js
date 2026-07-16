/**
 * SYNOPSIS: Use either the TMPDIR environment variable or default to os.tmpdir()
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  autoRegisterProductModules,
  getModuleHealth,
  getModuleHealthFor,
} from '../startup/auto-register-product-modules.js';

// Use either the TMPDIR environment variable or default to os.tmpdir()
const tmpDir = process.env.TMPDIR || os.tmpdir();
const tmp = fs.mkdtempSync(path.resolve(path.join(tmpDir, 'autoreg-')));

function writeMod(name, body) {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, body, 'utf8');
  return p;
}

const goodPath = writeMod(
  'good-routes.js',
  `export function registerGood(app, deps) { app.__mounted = (app.__mounted || 0) + 1; app.__deps = deps; }`
);
const throwPath = writeMod(
  'throws-routes.js',
  `export function register() { throw new Error('boom in register'); }`
);
const noRegPath = writeMod(
  'noreg-routes.js',
  `export const something = 1;`
);
const brokenImportPath = writeMod(
  'broken-routes.js',
  `import { doesNotExist } from './nowhere-at-all.js'; export function register() {}`
);

test('good module mounts and records healthy', async () => {
  const app = {};
  const results = await autoRegisterProductModules(app, { k: 1 }, {
    logger: { info() {}, warn() {} },
    modules: [{ path: goodPath, register: 'registerGood' }],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'mounted');
  assert.equal(app.__mounted, 1);
  assert.deepEqual(app.__deps, { k: 1 });
  assert.equal(getModuleHealthFor(goodPath)?.status, 'mounted');
});

test('missing file, broken import, throwing register, and no register-fn all record errors — and never abort siblings', async () => {
  const app = {};
  const results = await autoRegisterProductModules(app, {}, {
    logger: { info() {}, warn() {} },
    modules: [
      { path: path.resolve(path.join(tmp, 'does-not-exist.js')), register: 'register' },
      { path: brokenImportPath, register: 'register' },
      { path: throwPath, register: 'register' },
      { path: noRegPath, register: 'register' },
      { path: goodPath, register: 'registerGood' }, // sibling still mounts after 4 failures
    ],
  });
  assert.equal(results.length, 5);
  assert.equal(results[0].status, 'error');
  assert.match(results[0].error, /does not exist/i);
  assert.equal(results[1].status, 'error');
  assert.match(results[1].error, /import_failed/);
  assert.equal(results[2].status, 'error');
  assert.match(results[2].error, /register_threw|boom in register/);
  assert.equal(results[3].status, 'error');
  assert.match(results[3].error, /no register function/i);
  assert.equal(results[4].status, 'mounted'); // fail-open: siblings unaffected
});

test('disabled entries and empty registry are no-ops', async () => {
  const app = {};
  const results = await autoRegisterProductModules(app, {}, {
    logger: { info() {}, warn() {} },
    modules: [{ path: goodPath, register: 'registerGood', enabled: false }],
  });
  assert.equal(results.length, 0);
  const empty = await autoRegisterProductModules({}, {}, { logger: { info() {}, warn() {} }, modules: [] });
  assert.equal(empty.length, 0);
});

test('getModuleHealth returns a serializable manifest', async () => {
  const health = getModuleHealth();
  assert.ok(Array.isArray(health.modules));
  assert.ok(typeof health.generated_at === 'string');
  assert.doesNotThrow(() => JSON.stringify(health));
});

/**
 * SYNOPSIS: Import-resolution guard — every route + spine module must load
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Import-resolution guard for the production route surface + founder/builder spine.
 *
 * Node's ESM loader throws at instantiation if a module imports a *named export*
 * that no longer exists (e.g. after a symbol is moved between files). `node --check`
 * and madge do NOT catch this — it only surfaces at boot, which took the live site
 * down when `stripChairDoPrefix` was moved to a leaf module but one importer was
 * missed. Actually importing each module makes CI fail on the same error the
 * runtime would hit, instead of shipping a boot crash.
 *
 * Coverage:
 *  - EVERY `routes/*.js` module (the full registerable route surface), discovered
 *    dynamically so new routes are guarded automatically.
 *  - The explicit founder/builder spine services + middleware below (transitive
 *    leaves that a route sweep might not reach directly).
 *
 * DB safety: a syntactically-valid dummy DATABASE_URL is set before any import so
 * route-level config validators (which `process.exit` when it is absent) pass.
 * Pools are created lazily, so no real connection is attempted at import time —
 * verified by importing all routes with this dummy URL (0 failures, clean exit).
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://u:p@127.0.0.1:5432/dummy';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(here, '..', 'routes');

const ROUTE_MODULES = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith('.js'))
  .sort()
  .map((f) => `../routes/${f}`);

const SPINE_MODULES = [
  '../services/lumin-chair-orchestrator.js',
  '../services/lumin-chair-system-actions.js',
  '../services/chair-intent-signals.js',
  '../services/lumin-conversation-routing.js',
  '../services/founder-build-self-repair.js',
  '../services/point-b-navigator.js',
  '../services/truth-enforcement-spine.js',
  '../middleware/truth-response-enforcer.js',
];

for (const mod of [...ROUTE_MODULES, ...SPINE_MODULES]) {
  test(`module resolves all named imports: ${mod}`, async () => {
    await assert.doesNotReject(
      () => import(mod),
      `Import/export resolution failed for ${mod} — a named export it imports is missing (boot crash risk).`,
    );
  });
}

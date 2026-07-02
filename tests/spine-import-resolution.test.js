/**
 * SYNOPSIS: Import-resolution guard — every founder/builder spine module must load
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Import-resolution guard for the founder/builder spine.
 *
 * Node's ESM loader throws at instantiation if a module imports a *named export*
 * that no longer exists (e.g. after a symbol is moved between files). `node --check`
 * and madge do NOT catch this — it only surfaces at boot, which took the live site
 * down when `stripChairDoPrefix` was moved to a leaf module but one importer was
 * missed. Actually importing each spine module makes CI fail on the same error the
 * runtime would hit, instead of shipping a boot crash.
 *
 * Only side-effect-free factory/pure modules are listed (no DB-connecting startup
 * modules), so this test needs no database or network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const SPINE_MODULES = [
  '../routes/lifeos-builderos-command-control-routes.js',
  '../services/lumin-chair-orchestrator.js',
  '../services/lumin-chair-system-actions.js',
  '../services/chair-intent-signals.js',
  '../services/lumin-conversation-routing.js',
  '../services/founder-build-self-repair.js',
  '../services/point-b-navigator.js',
  '../services/truth-enforcement-spine.js',
  '../middleware/truth-response-enforcer.js',
];

for (const mod of SPINE_MODULES) {
  test(`spine module resolves all named imports: ${mod}`, async () => {
    await assert.doesNotReject(
      () => import(mod),
      `Import/export resolution failed for ${mod} — a named export it imports is missing (boot crash risk).`,
    );
  });
}

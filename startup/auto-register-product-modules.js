/**
 * SYNOPSIS: Convention-based auto-registration for product modules + a boot
 * module-health manifest. Lets the autonomous loop make a NEW route/UI module
 * LIVE by shipping single files (the module + one registry entry) without ever
 * editing the protected boot composition root — and records, per module, whether
 * it imported + mounted cleanly or threw (with the verbatim error), which is the
 * substrate the functional-proof completion gate + self-diagnosis read from.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'config/auto-registered-product-modules.json');

// In-memory boot health manifest, keyed by module repo-relative path. Each entry:
//   { module, register, status: 'mounted'|'error', mounted_at, error }
// A build step that adds a module is not "done" until its module reports
// `mounted` here; a module that failed to import/mount surfaces its exact error
// so the loop can repair the ROOT CAUSE instead of spinning.
const moduleHealth = new Map();

export function getModuleHealth() {
  return {
    modules: Array.from(moduleHealth.values()),
    generated_at: new Date().toISOString(),
  };
}

/** Health for a single module by its repo-relative path (e.g. "routes/x-routes.js"). */
export function getModuleHealthFor(relPath) {
  if (!relPath) return null;
  const key = String(relPath).split(path.sep).join('/');
  return moduleHealth.get(key) || null;
}

/**
 * Load the explicit opt-in registry. Only modules listed here are imported and
 * mounted — legacy/broken files are never touched. Because the path is known
 * from the registry, an import failure is still RECORDED (with its verbatim
 * error), which is exactly the failure mode a functional gate must catch.
 * Shape: { "modules": [ { "path": "routes/x-routes.js", "register": "registerX",
 *          "mount_path"?: "/api/v1/x", "enabled"?: true } ] }
 */
export function loadAutoRegisterRegistry() {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.modules)) return parsed.modules;
  } catch { /* no registry yet → nothing to auto-register */ }
  return [];
}

function resolveRegisterFn(mod, registerName) {
  if (registerName && typeof mod[registerName] === 'function') return mod[registerName];
  if (typeof mod.register === 'function') return mod.register;
  if (typeof mod.default === 'function') return mod.default;
  const hit = Object.entries(mod).find(([k, v]) => typeof v === 'function' && /^register/i.test(k));
  return hit ? hit[1] : null;
}

/**
 * Import + mount every enabled module in the registry, recording health for each.
 * Fail-open per module: one broken module never aborts the others or boot.
 */
export async function autoRegisterProductModules(app, deps = {}, { logger = console, modules: injectedModules, root } = {}) {
  const modules = Array.isArray(injectedModules) ? injectedModules : loadAutoRegisterRegistry();
  const baseDir = root || ROOT;
  const results = [];
  for (const spec of modules) {
    if (!spec || !spec.path || spec.enabled === false) continue;
    const key = String(spec.path).split(path.sep).join('/');
    const entry = { module: key, register: spec.register || null, status: 'pending', mounted_at: null, error: null };
    const abs = path.isAbsolute(spec.path) ? spec.path : path.join(baseDir, key);
    let mod;
    try {
      if (!fs.existsSync(abs)) throw new Error(`module file does not exist: ${key}`);
      // Cache-busting reload path: a module that was absent/failed at boot can be
      // re-imported at runtime with a unique query so Node ESM does not return the
      // stale rejected promise.
      const importUrl = spec.reload
        ? `${pathToFileURL(abs).href}?import_reload=${Date.now()}`
        : pathToFileURL(abs).href;
      mod = await import(importUrl);
    } catch (err) {
      entry.status = 'error';
      entry.error = `import_failed: ${String(err && err.stack ? err.stack : err)}`.slice(0, 1000);
      moduleHealth.set(key, entry);
      results.push(entry);
      logger?.warn?.(`⚠️ [AUTO-REGISTER] ${key} failed to import: ${entry.error}`);
      continue;
    }
    const regFn = resolveRegisterFn(mod, spec.register);
    if (typeof regFn !== 'function') {
      entry.status = 'error';
      entry.error = `no register function found (looked for "${spec.register || 'register'}")`;
      moduleHealth.set(key, entry);
      results.push(entry);
      logger?.warn?.(`⚠️ [AUTO-REGISTER] ${key}: ${entry.error}`);
      continue;
    }
    try {
      await regFn(app, deps);
      entry.status = 'mounted';
      entry.mounted_at = new Date().toISOString();
      logger?.info?.(`✅ [AUTO-REGISTER] ${key} mounted${spec.mount_path ? ` (${spec.mount_path})` : ''}`);
    } catch (err) {
      entry.status = 'error';
      entry.error = `register_threw: ${String(err && err.stack ? err.stack : err)}`.slice(0, 1000);
      logger?.warn?.(`⚠️ [AUTO-REGISTER] ${key} register threw: ${entry.error}`);
    }
    moduleHealth.set(key, entry);
    results.push(entry);
  }
  return results;
}

export default autoRegisterProductModules;

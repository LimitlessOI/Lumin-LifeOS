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
const REQUIRED_RUNTIME_SPECS = Object.freeze([
  {
    path: 'routes/runtime-heartbeat-routes.js',
    register: 'registerRuntimeHeartbeatRoutes',
    mount_path: '/api/v1/runtime/heartbeat',
    enabled: true,
    note: 'Abbott public runtime heartbeat. Fresh liveness/model-key-presence/git/Railway metadata plus boot receipt on runtime-receipts branch.',
  },
  {
    path: 'routes/autonomous-recovery-runtime-routes.js',
    register: 'registerAutonomousRecoveryRuntimeRoutes',
    mount_path: '/api/v1/runtime/recovery/status',
    enabled: true,
    note: 'Production SENTRY recovery hook. Keeps technical recovery inside SENTRY -> Conductor -> Architect, re-verifies reality, forbids terminal stop/founder-as-router, and runs the external Costello infrastructure guardian.',
  },
  {
    path: 'routes/taloa-supervised-overlay-routes.js',
    register: 'registerTaloaSupervisedOverlayRoutes',
    mount_path: '/api/v1/extension/a2z',
    enabled: true,
    note: 'Live supervised multi-session Taloa A2Z control plane. Connects the new observe/select/act/verify runtime to the proven extension-drive bridge; browser mutations require explicit founder approval.',
  },
]);

const moduleHealth = new Map();

export function getModuleHealth() {
  return {
    modules: Array.from(moduleHealth.values()),
    generated_at: new Date().toISOString(),
  };
}

export function getModuleHealthFor(relPath) {
  if (!relPath) return null;
  const key = String(relPath).split(path.sep).join('/');
  return moduleHealth.get(key) || null;
}

export function loadAutoRegisterRegistry() {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.modules)) {
      const modules = [...parsed.modules];
      for (const required of REQUIRED_RUNTIME_SPECS) {
        if (!modules.some((spec) => spec?.path === required.path)) modules.push(required);
      }
      return modules;
    }
  } catch { /* required runtime modules remain observable even if registry parsing fails */ }
  return [...REQUIRED_RUNTIME_SPECS];
}

function resolveRegisterFn(mod, registerName) {
  if (registerName && typeof mod[registerName] === 'function') return mod[registerName];
  if (typeof mod.register === 'function') return mod.register;
  if (typeof mod.default === 'function') return mod.default;
  const hit = Object.entries(mod).find(([k, v]) => typeof v === 'function' && /^register/i.test(k));
  return hit ? hit[1] : null;
}

export async function autoRegisterProductModules(app, deps = {}, { logger = console, modules: injectedModules, root } = {}) {
  const rawModules = Array.isArray(injectedModules) ? injectedModules : loadAutoRegisterRegistry();
  const byPath = new Map();
  for (const spec of rawModules) {
    if (!spec || !spec.path) continue;
    const key = String(spec.path).split(path.sep).join('/');
    const isEnabled = spec.enabled !== false;
    const existing = byPath.get(key);
    if (!existing || isEnabled || existing.enabled === false) byPath.set(key, spec);
  }
  const modules = Array.from(byPath.values());
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
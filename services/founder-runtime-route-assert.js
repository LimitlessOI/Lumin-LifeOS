/**
 * SYNOPSIS: Assert founder-lane required routes are mounted on the Express app.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listAppRoutes } from './express-route-snapshot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(__dirname, '../config/founder-runtime-required-routes.json');

function normalizePath(p) {
  const s = String(p || '').trim();
  if (!s) return '/';
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function routeKey(method, routePath) {
  return `${String(method || 'GET').toUpperCase()} ${normalizePath(routePath)}`;
}

export function loadFounderRequiredRoutesManifest(manifestPath = DEFAULT_MANIFEST) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return Array.isArray(raw.routes) ? raw.routes : [];
}

/**
 * Exact method+path, or any mounted path that is a prefix of the required path
 * (covers router.use('/api/v1/lifeos/finance') satisfying .../finance/goals).
 */
export function routeSatisfied(mountedKeys, method, requiredPath) {
  const methodUpper = String(method || 'GET').toUpperCase();
  const wantPath = normalizePath(requiredPath);
  const exact = routeKey(methodUpper, wantPath);
  if (mountedKeys.has(exact)) return true;

  for (const key of mountedKeys) {
    const space = key.indexOf(' ');
    if (space < 0) continue;
    const m = key.slice(0, space);
    const p = normalizePath(key.slice(space + 1));
    if (m !== methodUpper && m !== 'ALL') continue;
    if (wantPath === p || wantPath.startsWith(`${p}/`)) return true;
  }

  for (const key of mountedKeys) {
    const space = key.indexOf(' ');
    if (space < 0) continue;
    const p = normalizePath(key.slice(space + 1));
    if (p !== '/' && (wantPath === p || wantPath.startsWith(`${p}/`))) return true;
  }

  return false;
}

export function assertFounderRuntimeRoutes(app, {
  manifestPath = DEFAULT_MANIFEST,
  routes = null,
} = {}) {
  const required = routes || loadFounderRequiredRoutesManifest(manifestPath);
  const mounted = listAppRoutes(app);
  const mountedKeys = new Set(mounted);
  const missing = [];
  const missingCritical = [];

  for (const row of required) {
    const method = row.method || 'GET';
    const routePath = row.path;
    if (!routePath) continue;
    if (!routeSatisfied(mountedKeys, method, routePath)) {
      const entry = routeKey(method, routePath);
      missing.push(entry);
      if (row.critical !== false) missingCritical.push(entry);
    }
  }

  return {
    ok: missingCritical.length === 0,
    mounted_count: mounted.length,
    required_count: required.length,
    missing,
    missing_critical: missingCritical,
  };
}

/**
 * SYNOPSIS: LifeRE per-user twin file store with optional PG mirror.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TWINS_ROOT = path.join(ROOT, 'data', 'twins');

export class ForbiddenCrossUserError extends Error {
  constructor(message = 'FORBIDDEN_CROSS_USER') {
    super(message);
    this.code = 'FORBIDDEN_CROSS_USER';
  }
}

export class InvalidTwinPathError extends Error {
  constructor(message = 'INVALID_TWIN_PATH') {
    super(message);
    this.code = 'INVALID_TWIN_PATH';
  }
}

function safeSegment(value, label) {
  const segment = String(value ?? '');
  if (!segment || segment === '.' || segment === '..' || /[\/\\\0]/.test(segment)) {
    throw new InvalidTwinPathError(`${label} contains an unsafe path segment`);
  }
  return segment;
}

function confinedTwinPath(...segments) {
  const target = path.resolve(TWINS_ROOT, ...segments);
  if (!target.startsWith(`${TWINS_ROOT}${path.sep}`)) {
    throw new InvalidTwinPathError();
  }
  return target;
}

function twinPath({ tenantId, userId, twinKey, moduleKey }) {
  if (twinKey?.startsWith('founder/')) {
    const rawSegments = String(twinKey).split('/');
    const founderSegments = rawSegments.map((segment, index) =>
      safeSegment(index === rawSegments.length - 1 ? segment.replace(/\.json$/, '') : segment, 'twinKey')
    );
    const last = founderSegments.length - 1;
    founderSegments[last] = `${founderSegments[last]}.json`;
    return confinedTwinPath(...founderSegments);
  }
  const safeTenantId = safeSegment(tenantId, 'tenantId');
  const safeUserId = safeSegment(userId, 'userId');
  if (moduleKey) {
    return confinedTwinPath(safeTenantId, safeUserId, 'modules', `${safeSegment(moduleKey, 'moduleKey')}.json`);
  }
  return confinedTwinPath(safeTenantId, safeUserId, `${safeSegment(twinKey, 'twinKey')}.json`);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function createLifeRETwinStore({ pool = null, logger = console } = {}) {
  async function mirrorToPg({ tenantId, userId, twinKey, payload }) {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO lifere_twin_pg_mirror (tenant_id, user_id, twin_key, payload, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (tenant_id, user_id, twin_key)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [tenantId, userId, twinKey, payload]
      );
    } catch (err) {
      logger.warn?.('[lifere-twin-store] PG mirror skip:', err.message);
    }
  }

  function readTwin({ tenantId = 'default', userId, twinKey, moduleKey, requesterId }) {
    if (requesterId && requesterId !== userId && !twinKey?.startsWith('founder/')) {
      throw new ForbiddenCrossUserError();
    }
    const fp = twinPath({ tenantId, userId, twinKey, moduleKey });
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  }

  async function writeTwin({ tenantId = 'default', userId, twinKey, moduleKey, payload, receiptMeta = {}, requesterId }) {
    if (requesterId && requesterId !== userId && !twinKey?.startsWith('founder/')) {
      throw new ForbiddenCrossUserError();
    }
    const fp = twinPath({ tenantId, userId, twinKey, moduleKey });
    ensureDir(fp);
    const body = { ...payload, updated_at: new Date().toISOString() };
    fs.writeFileSync(fp, `${JSON.stringify(body, null, 2)}\n`);
    const key = moduleKey ? `modules/${moduleKey}` : twinKey;
    await mirrorToPg({ tenantId, userId, twinKey: key, payload: body });
    const receipt = {
      schema: 'lifere_twin_update_v1',
      path: path.relative(ROOT, fp),
      receipt_meta: receiptMeta,
      at: body.updated_at,
    };
    return { path: fp, receipt };
  }

  function listModuleTwins({ tenantId = 'default', userId }) {
    const dir = confinedTwinPath(safeSegment(tenantId, 'tenantId'), safeSegment(userId, 'userId'), 'modules');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  }

  function listTwinsSummary({ tenantId = 'default', userId }) {
    const twins = [];
    const safeTenantId = safeSegment(tenantId, 'tenantId');
    const safeUserId = safeSegment(userId, 'userId');
    const baseDir = confinedTwinPath(safeTenantId, safeUserId);
    if (fs.existsSync(baseDir)) {
      for (const name of fs.readdirSync(baseDir)) {
        if (!name.endsWith('.json')) continue;
        const twinKey = name.replace(/\.json$/, '');
        const fp = path.join(baseDir, name);
        let updated_at = null;
        try {
          const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
          updated_at = raw?.updated_at || null;
        } catch {
          updated_at = null;
        }
        try {
          const st = fs.statSync(fp);
          if (!updated_at) updated_at = st.mtime.toISOString();
        } catch {
          /* ignore */
        }
        twins.push({ kind: 'user', twin_key: twinKey, updated_at });
      }
    }
    for (const moduleKey of listModuleTwins({ tenantId: safeTenantId, userId: safeUserId })) {
      const fp = confinedTwinPath(safeTenantId, safeUserId, 'modules', `${safeSegment(moduleKey, 'moduleKey')}.json`);
      let updated_at = null;
      try {
        const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
        updated_at = raw?.updated_at || fs.statSync(fp).mtime.toISOString();
      } catch {
        updated_at = null;
      }
      twins.push({ kind: 'module', twin_key: moduleKey, updated_at });
    }
    twins.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    return { ok: true, twins, count: twins.length, tenant_id: tenantId, user_id: userId };
  }

  return { readTwin, writeTwin, listModuleTwins, listTwinsSummary, twinPath };
}

export const { readTwin, writeTwin, listModuleTwins } = createLifeRETwinStore();

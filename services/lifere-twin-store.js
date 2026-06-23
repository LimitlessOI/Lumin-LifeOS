/**
 * SYNOPSIS: LifeRE per-user twin file store with optional PG mirror.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class ForbiddenCrossUserError extends Error {
  constructor(message = 'FORBIDDEN_CROSS_USER') {
    super(message);
    this.code = 'FORBIDDEN_CROSS_USER';
  }
}

function twinPath({ tenantId, userId, twinKey, moduleKey }) {
  if (twinKey?.startsWith('founder/')) {
    return path.join(ROOT, 'data/twins', twinKey.endsWith('.json') ? twinKey : `${twinKey}.json`);
  }
  if (moduleKey) {
    return path.join(ROOT, 'data/twins', tenantId, userId, 'modules', `${moduleKey}.json`);
  }
  return path.join(ROOT, 'data/twins', tenantId, userId, `${twinKey}.json`);
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
    const dir = path.join(ROOT, 'data/twins', tenantId, userId, 'modules');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  }

  return { readTwin, writeTwin, listModuleTwins, twinPath };
}

export const { readTwin, writeTwin, listModuleTwins } = createLifeRETwinStore();

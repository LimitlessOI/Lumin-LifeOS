/**
 * SYNOPSIS: LifeRE Permission Twin — autonomy ladder 0–5 per action type.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'config/lifere-action-types.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

export function createLifeREPermissionTwin({ pool = null } = {}) {
  async function getAutonomyLevel({ tenantId = 'default', userId, actionType }) {
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT autonomy_level, bounds FROM lifere_permission_grants
           WHERE tenant_id = $1 AND user_id = $2 AND action_type = $3`,
          [tenantId, userId, actionType]
        );
        if (rows[0]) return { level: rows[0].autonomy_level, bounds: rows[0].bounds };
      } catch {
        /* table may not exist yet */
      }
    }
    const cfg = loadConfig();
    const founder = cfg.founder_overrides_adam?.[actionType];
    if (userId === 'adam' && founder != null) return { level: founder, bounds: {} };
    const def = cfg.action_types.find((a) => a.id === actionType);
    return { level: def?.default_level ?? cfg.default_outbound_level ?? 1, bounds: {} };
  }

  function assertCanExecute({ level, actionType, draft, approvedTemplateHash }) {
    if (level === 0) return { allowed: false, reason: 'suggest_only' };
    if (level === 1 && !draft) return { allowed: false, reason: 'draft_required' };
    if (level === 2) return { allowed: false, reason: 'approval_queue_required' };
    if (level === 3 && !approvedTemplateHash) return { allowed: false, reason: 'approved_pattern_required' };
    return { allowed: level >= 3, reason: level >= 4 ? 'bounded_or_full' : 'pattern_ok', action_type: actionType };
  }

  async function seedDefaults({ tenantId = 'default', userId = 'adam' }) {
    if (!pool) return { seeded: false };
    const cfg = loadConfig();
    for (const action of cfg.action_types.slice(0, 4)) {
      await pool.query(
        `INSERT INTO lifere_permission_grants (tenant_id, user_id, action_type, autonomy_level, bounds, granted_by)
         VALUES ($1,$2,$3,$4,'{}','system_default') ON CONFLICT DO NOTHING`,
        [tenantId, userId, action.id, action.default_level]
      );
    }
    return { seeded: true };
  }

  async function listGrants({ tenantId = 'default', userId = 'adam' }) {
    const cfg = loadConfig();
    const grants = [];
    for (const action of cfg.action_types) {
      const level = await getAutonomyLevel({ tenantId, userId, actionType: action.id });
      grants.push({
        action_type: action.id,
        label: action.id.replace(/_/g, ' '),
        autonomy_level: level.level,
        bounds: level.bounds || {},
        default_level: action.default_level,
      });
    }
    return {
      ok: true,
      grants,
      source: pool ? 'pg_or_config' : 'config',
      levels: cfg.levels,
    };
  }

  async function setAutonomyLevel({
    tenantId = 'default',
    userId = 'adam',
    actionType,
    autonomyLevel,
    grantedBy = 'agent_ui',
    bounds = {},
  }) {
    const level = Math.max(0, Math.min(5, Number(autonomyLevel)));
    if (!actionType) return { ok: false, error: 'action_type_required' };
    const cfg = loadConfig();
    const known = cfg.action_types.some((a) => a.id === actionType);
    if (!known) return { ok: false, error: 'unknown_action_type', action_type: actionType };
    if (pool) {
      await pool.query(
        `INSERT INTO lifere_permission_grants (tenant_id, user_id, action_type, autonomy_level, bounds, granted_by)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)
         ON CONFLICT (tenant_id, user_id, action_type)
         DO UPDATE SET autonomy_level = EXCLUDED.autonomy_level, bounds = EXCLUDED.bounds,
           granted_by = EXCLUDED.granted_by, granted_at = now()`,
        [tenantId, userId, actionType, level, JSON.stringify(bounds || {}), grantedBy]
      );
    }
    return {
      ok: true,
      action_type: actionType,
      autonomy_level: level,
      persisted: !!pool,
      label: pool ? 'KNOW' : 'THINK',
      note: pool ? null : 'No DB — level returned but not persisted',
    };
  }

  return { getAutonomyLevel, assertCanExecute, seedDefaults, listGrants, setAutonomyLevel, loadConfig };
}

export async function getAutonomyLevel(opts) {
  return createLifeREPermissionTwin(opts).getAutonomyLevel(opts);
}

export function assertCanExecute(opts) {
  return createLifeREPermissionTwin().assertCanExecute(opts);
}

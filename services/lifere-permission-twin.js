/**
 * SYNOPSIS: LifeRE Permission Twin — autonomy ladder 0–5 per action type.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
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

  return { getAutonomyLevel, assertCanExecute, seedDefaults, loadConfig };
}

export async function getAutonomyLevel(opts) {
  return createLifeREPermissionTwin(opts).getAutonomyLevel(opts);
}

export function assertCanExecute(opts) {
  return createLifeREPermissionTwin().assertCanExecute(opts);
}

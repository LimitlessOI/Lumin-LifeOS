/**
 * SYNOPSIS: Exports readTypedTwinState — services/voluntary-progress-twin-read.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { readTwin, ForbiddenCrossUserError } from './lifere-twin-store.js';

export async function readTypedTwinState(pool, { userId, tenantId = 'default', twinKey, moduleKey = null, requesterId = null, fields = [] }) {
  await pool.query('CREATE TABLE IF NOT EXISTS lifere_twin_store (tenant_id TEXT, user_id TEXT, twin_key TEXT, module_key TEXT, requester_id TEXT, data JSONB)');
  
  try {
    const rawTwin = readTwin({ tenantId, userId, twinKey, moduleKey, requesterId });
    const state = fields.map(field => {
      if (!rawTwin || !(field in rawTwin)) {
        return { field, status: 'unknown', value: null };
      }
      return { field, status: 'user-stated', value: rawTwin[field] };
    });
    return { ok: true, state };
  } catch (error) {
    if (error instanceof ForbiddenCrossUserError) {
      return { ok: false, error: 'forbidden_cross_user', state: [] };
    }
    throw error;
  }
}

export function isFieldKnown(state, field) {
  return state.some(entry => entry.field === field && entry.status !== 'unknown');
}

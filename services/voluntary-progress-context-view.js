/**
 * SYNOPSIS: Exports activateContextView — services/voluntary-progress-context-view.js.
 */
import pg from 'pg';

const { Pool } = pg;

export async function activateContextView(pool, { user_id, activation_reason, permitted_reads, forbidden_reads = [], permitted_proposals = [], consent_scope = 'internal_operational', ttl_minutes = 30 }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_context_views (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, activation_reason TEXT NOT NULL, permitted_reads JSONB NOT NULL, forbidden_reads JSONB NOT NULL DEFAULT \'[]\', permitted_proposals JSONB NOT NULL DEFAULT \'[]\', consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', expires_at TIMESTAMPTZ NOT NULL, activated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const result = await pool.query(
    `INSERT INTO voluntary_progress_context_views (user_id, activation_reason, permitted_reads, forbidden_reads, permitted_proposals, consent_scope, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' minutes')::interval)
     RETURNING *`,
    [user_id, activation_reason, permitted_reads, forbidden_reads, permitted_proposals, consent_scope, ttl_minutes]
  );
  return result.rows[0];
}

export function applyContextView(twinReadState, contextViewRow) {
  const permittedFields = new Set(contextViewRow.permitted_reads);
  const forbiddenFields = new Set(contextViewRow.forbidden_reads);

  return twinReadState.filter(entry => {
    const isPermitted = permittedFields.has(entry.field);
    const isForbidden = forbiddenFields.has(entry.field);
    return isPermitted && !isForbidden;
  });
}

export async function isContextViewExpired(pool, { context_view_id }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_context_views (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, activation_reason TEXT NOT NULL, permitted_reads JSONB NOT NULL, forbidden_reads JSONB NOT NULL DEFAULT \'[]\', permitted_proposals JSONB NOT NULL DEFAULT \'[]\', consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', expires_at TIMESTAMPTZ NOT NULL, activated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const result = await pool.query(
    'SELECT expires_at FROM voluntary_progress_context_views WHERE id = $1',
    [context_view_id]
  );
  if (result.rows.length === 0) {
    return true;
  }
  const { expires_at } = result.rows[0];
  return expires_at < new Date();
}
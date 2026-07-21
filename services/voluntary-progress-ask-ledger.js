/**
 * SYNOPSIS: Exports recordAsk — services/voluntary-progress-ask-ledger.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
export async function recordAsk(pool, { user_id, ask_type, ask_context = null, channel = null, consent_scope = 'internal_operational' }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_asks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, ask_type TEXT NOT NULL, ask_context TEXT, channel TEXT, consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', asked_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const result = await pool.query(
    'INSERT INTO voluntary_progress_asks (user_id, ask_type, ask_context, channel, consent_scope) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [user_id, ask_type, ask_context, channel, consent_scope]
  );
  return result.rows[0];
}

export async function recordOptOut(pool, { user_id, ask_type, opt_out_reason = null, consent_scope = 'internal_operational' }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_optouts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, ask_type TEXT NOT NULL, opt_out_reason TEXT, consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, ask_type))');
  const result = await pool.query(
    `INSERT INTO voluntary_progress_optouts (user_id, ask_type, opt_out_reason, consent_scope)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, ask_type) DO UPDATE SET
       opt_out_reason = EXCLUDED.opt_out_reason,
       consent_scope = EXCLUDED.consent_scope,
       opted_out_at = now()
     RETURNING *`,
    [user_id, ask_type, opt_out_reason, consent_scope]
  );
  return result.rows[0];
}

export async function hasOptedOut(pool, { user_id, ask_type }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_optouts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, ask_type TEXT NOT NULL, opt_out_reason TEXT, consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, ask_type))');
  const result = await pool.query(
    'SELECT opted_out_at, opt_out_reason, consent_scope FROM voluntary_progress_optouts WHERE user_id = $1 AND ask_type = $2',
    [user_id, ask_type]
  );
  return result.rows[0] || null;
}

export async function getRecentAsks(pool, { user_id, limit = 50 } = {}) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_asks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, ask_type TEXT NOT NULL, ask_context TEXT, channel TEXT, consent_scope TEXT NOT NULL DEFAULT \'internal_operational\', asked_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const result = await pool.query(
    'SELECT id, user_id, ask_type, ask_context, channel, consent_scope, asked_at FROM voluntary_progress_asks WHERE user_id = $1 ORDER BY asked_at DESC LIMIT $2',
    [user_id, limit]
  );
  return result.rows;
}
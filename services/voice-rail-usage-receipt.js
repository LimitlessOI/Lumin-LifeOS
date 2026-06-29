/**
 * SYNOPSIS: Voice Rail — fetch latest council token/cost receipt after a founder reply.
 * Voice Rail — fetch latest council token/cost receipt after a founder reply.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

export async function fetchVoiceRailUsageReceipt(pool, { since, taskType = 'voice_rail_department' } = {}) {
  if (!pool) return null;
  const params = [taskType];
  let sql = `
    SELECT provider, model, task_type, input_tokens, output_tokens,
           cost_usd, saved_cost_usd, provider_was_free, logged_at
      FROM token_usage_log
     WHERE task_type = $1`;
  if (since) {
    params.push(since);
    sql += ` AND logged_at >= $2`;
  }
  sql += ` ORDER BY logged_at DESC LIMIT 1`;

  const { rows } = await pool.query(sql, params);
  const row = rows[0];
  if (!row) return null;

  const cost = Number(row.cost_usd) || 0;
  return {
    provider: row.provider,
    model: row.model,
    input_tokens: Number(row.input_tokens) || 0,
    output_tokens: Number(row.output_tokens) || 0,
    cost_usd: cost,
    cost_display: cost > 0 ? `$${cost.toFixed(4)}` : row.provider_was_free ? '$0 (free tier)' : '$0',
    provider_was_free: Boolean(row.provider_was_free),
    logged_at: row.logged_at,
  };
}

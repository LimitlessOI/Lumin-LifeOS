/**
 * SYNOPSIS: Operator Consumption Ledger (OCL1) — manual Cursor/IDE token accounting.
 * Operator Consumption Ledger (OCL1) — manual Cursor/IDE token accounting.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */

const VALID_SOURCES = new Set([
  'cursor', 'chatgpt', 'claude', 'gemini', 'grok', 'codex', 'manual', 'other',
]);

const MODEL_COST_PER_M = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'deepseek-chat': { input: 0.1, output: 0.3 },
  default: { input: 3.0, output: 10.0 },
};

function normalizeModel(model = '') {
  return String(model || 'unknown').trim().toLowerCase();
}

export function estimateOperatorCost({ model, input_tokens = 0, output_tokens = 0 }) {
  const key = normalizeModel(model);
  const rates = MODEL_COST_PER_M[key] || MODEL_COST_PER_M.default;
  return (
    (Number(input_tokens) / 1_000_000) * rates.input +
    (Number(output_tokens) / 1_000_000) * rates.output
  );
}

export function createOperatorConsumptionLedgerService({ pool, logger = console }) {
  function validatePayload(payload = {}) {
    const source = String(payload.source || '').trim().toLowerCase();
    if (!source) {
      throw new Error('source is required (cursor|chatgpt|claude|gemini|grok|codex|manual|other)');
    }
    if (!VALID_SOURCES.has(source)) {
      throw new Error(`invalid source: ${source}`);
    }

    const input = Number(payload.input_tokens ?? 0);
    const output = Number(payload.output_tokens ?? 0);
    const model = payload.model ? String(payload.model).trim() : null;

    if (!model && !payload.unknown_reason) {
      throw new Error('model is required unless unknown_reason is provided');
    }
    if ((input + output) <= 0 && !payload.unknown_reason) {
      throw new Error('input_tokens + output_tokens must be > 0 unless unknown_reason is provided');
    }

    return { source, input, output, model };
  }

  async function recordOperatorUsage(payload = {}) {
    if (!pool) throw new Error('database pool unavailable');
    const { source, input, output, model } = validatePayload(payload);

    const estimated_cost_usd = payload.estimated_cost_usd != null
      ? Number(payload.estimated_cost_usd)
      : estimateOperatorCost({ model: model || 'unknown', input_tokens: input, output_tokens: output });

    const result = await pool.query(
      `INSERT INTO operator_consumption_ledger (
         source, operator, session_id, task_id, blueprint_id, product_lane, model,
         input_tokens, output_tokens, estimated_cost_usd, free_tier, free_tier_source,
         remaining_free_tokens_estimate, manual_entry, evidence_note, screenshot_path, raw_payload
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        source,
        payload.operator || 'adam',
        payload.session_id || null,
        payload.task_id || null,
        payload.blueprint_id || null,
        payload.product_lane || null,
        model || payload.unknown_reason || 'unknown',
        input,
        output,
        estimated_cost_usd,
        Boolean(payload.free_tier),
        payload.free_tier_source || null,
        payload.remaining_free_tokens_estimate ?? null,
        payload.manual_entry !== false,
        payload.evidence_note || payload.unknown_reason || null,
        payload.screenshot_path || null,
        payload.raw_payload ? JSON.stringify(payload.raw_payload) : null,
      ]
    );

    logger.info?.({ id: result.rows[0]?.id, source, total: input + output }, '[OCL] operator usage recorded');
    return result.rows[0];
  }

  async function getOperatorUsageSummary({ start, end, source } = {}) {
    if (!pool) return { rows: [], total: 0 };
    const clauses = [];
    const params = [];
    if (start) { params.push(start); clauses.push(`logged_at >= $${params.length}`); }
    if (end) { params.push(end); clauses.push(`logged_at <= $${params.length}`); }
    if (source) { params.push(source); clauses.push(`source = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT source,
              COUNT(*)::int AS entries,
              SUM(input_tokens)::int AS input_tokens,
              SUM(output_tokens)::int AS output_tokens,
              SUM(total_tokens)::int AS total_tokens,
              ROUND(SUM(estimated_cost_usd)::numeric, 6) AS estimated_cost_usd
       FROM operator_consumption_ledger
       ${where}
       GROUP BY source
       ORDER BY total_tokens DESC`,
      params
    );
    return { by_source: rows, filters: { start, end, source } };
  }

  async function getOperatorUsageRecent(limit = 20) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT * FROM operator_consumption_ledger ORDER BY logged_at DESC LIMIT $1`,
      [Math.min(Math.max(Number(limit) || 20, 1), 200)]
    );
    return rows;
  }

  return {
    recordOperatorUsage,
    getOperatorUsageSummary,
    getOperatorUsageRecent,
    estimateOperatorCost,
  };
}

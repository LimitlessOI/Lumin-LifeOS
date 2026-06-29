/**
 * SYNOPSIS: Timestamped operation ledger — duration + token correlation by task_id.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */

function newTaskId(prefix = 'op') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSystemOperationLedger({ pool, logger = console } = {}) {
  async function begin({
    operation,
    task_id = null,
    source = 'system',
    metadata = {},
  } = {}) {
    const taskId = task_id || newTaskId(String(operation || 'op').replace(/\W+/g, '_').slice(0, 24));
    const startedAt = new Date();
    if (!pool) {
      return {
        task_id: taskId,
        started_at: startedAt.toISOString(),
        end: async () => ({ ok: false, reason: 'no_pool' }),
      };
    }
    try {
      await pool.query(
        `INSERT INTO system_operation_log (task_id, operation, source, status, started_at, metadata)
         VALUES ($1, $2, $3, 'running', $4, $5)`,
        [taskId, operation, source, startedAt, JSON.stringify(metadata || {})]
      );
    } catch (err) {
      logger.warn?.({ err: err.message, operation }, '[SYS-OP-LEDGER] begin failed');
    }
    return {
      task_id: taskId,
      started_at: startedAt.toISOString(),
      end: async ({
        status = 'ok',
        token_receipt_id = null,
        input_tokens = 0,
        output_tokens = 0,
        cost_usd = 0,
        metadata: extra = {},
      } = {}) => complete({
        task_id: taskId,
        status,
        token_receipt_id,
        input_tokens,
        output_tokens,
        cost_usd,
        metadata: extra,
      }),
    };
  }

  async function complete({
    task_id,
    status = 'ok',
    token_receipt_id = null,
    input_tokens = 0,
    output_tokens = 0,
    cost_usd = 0,
    metadata = {},
  } = {}) {
    if (!pool || !task_id) return { ok: false, reason: 'missing_pool_or_task_id' };
    try {
      const { rows } = await pool.query(
        `UPDATE system_operation_log SET
           status = $2,
           ended_at = NOW(),
           token_receipt_id = COALESCE($3, token_receipt_id),
           input_tokens = COALESCE($4, input_tokens),
           output_tokens = COALESCE($5, output_tokens),
           cost_usd = COALESCE($6, cost_usd),
           metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE($7::jsonb, '{}'::jsonb)
         WHERE task_id = $1 AND status = 'running'
         RETURNING id, task_id, operation, started_at, ended_at, duration_ms,
                   input_tokens, output_tokens, total_tokens, cost_usd, token_receipt_id`,
        [
          task_id,
          status,
          token_receipt_id,
          input_tokens || null,
          output_tokens || null,
          cost_usd || null,
          Object.keys(metadata || {}).length ? JSON.stringify(metadata) : null,
        ]
      );
      return { ok: true, row: rows[0] || null };
    } catch (err) {
      logger.warn?.({ err: err.message, task_id }, '[SYS-OP-LEDGER] complete failed');
      return { ok: false, error: err.message };
    }
  }

  async function getTimeline({ sinceHours = 24, limit = 200, task_id = null } = {}) {
    if (!pool) return [];
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    const hours = Math.min(Math.max(Number(sinceHours) || 24, 1), 168);
    try {
      if (task_id) {
        const { rows } = await pool.query(
          `SELECT * FROM system_timeline_report
           WHERE task_id = $1
           ORDER BY started_at DESC NULLS LAST
           LIMIT $2`,
          [task_id, safeLimit]
        );
        return rows;
      }
      const { rows } = await pool.query(
        `SELECT * FROM system_timeline_report
         WHERE started_at >= NOW() - ($1 || ' hours')::interval
         ORDER BY started_at DESC NULLS LAST
         LIMIT $2`,
        [String(hours), safeLimit]
      );
      return rows;
    } catch (err) {
      logger.warn?.({ err: err.message }, '[SYS-OP-LEDGER] getTimeline failed');
      return [];
    }
  }

  async function getSummary({ sinceHours = 24 } = {}) {
    if (!pool) return null;
    const hours = Math.min(Math.max(Number(sinceHours) || 24, 1), 168);
    try {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS events,
           COUNT(*) FILTER (WHERE row_kind = 'token')::int AS token_events,
           COUNT(*) FILTER (WHERE row_kind = 'build')::int AS build_events,
           COUNT(*) FILTER (WHERE row_kind = 'operation')::int AS operation_events,
           COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
           COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
           COALESCE(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0)::int AS avg_duration_ms,
           MIN(started_at) AS earliest_at,
           MAX(COALESCE(ended_at, started_at)) AS latest_at
         FROM system_timeline_report
         WHERE started_at >= NOW() - ($1 || ' hours')::interval`,
        [String(hours)]
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  return { begin, complete, getTimeline, getSummary, newTaskId };
}

export default createSystemOperationLedger;

/**
 * SYNOPSIS: Token Accounting OS — universal metered ledger + budget gates + health.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */

import { createOperatorConsumptionLedgerService } from './operator-consumption-ledger-service.js';

function envNum(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name, fallback = false) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return v === '1' || v === 'true';
}

export function createTokenAccountingService({ pool, savingsLedger, logger = console }) {
  const strict = envBool('TOKEN_ACCOUNTING_STRICT', false);
  const allowUnmetered = envBool('TOKEN_ALLOW_UNMETERED', false);
  const softLimitUsd = envNum('TOKEN_DAILY_SOFT_LIMIT_USD', 50);
  const hardLimitUsd = envNum('TOKEN_DAILY_HARD_LIMIT_USD', 100);
  const alertThresholdUsd = envNum('TOKEN_ALERT_THRESHOLD_USD', 40);

  const ocl = createOperatorConsumptionLedgerService({ pool, logger });

  async function recordUnmeteredException({
    source = 'council',
    provider,
    model,
    task_id,
    task_type,
    reason,
    error,
    payload,
  }) {
    if (!pool) {
      logger.warn?.('[TOKEN-ACCT] unmetered exception (no pool):', reason);
      return null;
    }
    try {
      const result = await pool.query(
        `INSERT INTO ai_unmetered_exceptions (source, provider, model, task_id, task_type, reason, error, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          source,
          provider || null,
          model || null,
          task_id || null,
          task_type || null,
          reason,
          error || null,
          payload ? JSON.stringify(payload) : null,
        ]
      );
      logger.warn?.({ id: result.rows[0]?.id, reason }, '[TOKEN-ACCT] unmetered exception recorded');
      return result.rows[0]?.id;
    } catch (err) {
      logger.error?.({ err: err.message, reason }, '[TOKEN-ACCT] failed to record unmetered exception');
      return null;
    }
  }

  async function getTodaySpendUsd() {
    if (!pool) return 0;
    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost_usd), 0)::float AS spend
         FROM unified_token_accounting_report
         WHERE logged_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`
      );
      return Number(rows[0]?.spend || 0);
    } catch {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(cost_usd), 0)::float AS spend
         FROM token_usage_log
         WHERE logged_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`
      ).catch(() => ({ rows: [{ spend: 0 }] }));
      return Number(rows[0]?.spend || 0);
    }
  }

  async function checkBudgetGate() {
    const spend = await getTodaySpendUsd();
    if (spend >= hardLimitUsd) {
      return { allowed: false, level: 'hard', spend, hardLimitUsd, softLimitUsd, reason: 'daily hard limit exceeded' };
    }
    if (spend >= softLimitUsd) {
      return { allowed: true, level: 'soft', spend, hardLimitUsd, softLimitUsd, warning: 'daily soft limit exceeded' };
    }
    if (spend >= alertThresholdUsd) {
      return { allowed: true, level: 'alert', spend, hardLimitUsd, softLimitUsd, warning: 'alert threshold reached' };
    }
    return { allowed: true, level: 'ok', spend, hardLimitUsd, softLimitUsd };
  }

  async function recordMeteredCall(payload = {}) {
    const budget = await checkBudgetGate();
    if (!budget.allowed && strict) {
      throw new Error(`TOKEN_ACCOUNTING_STRICT: ${budget.reason} (spend=$${budget.spend.toFixed(4)})`);
    }

    if (!savingsLedger?.record) {
      const excId = await recordUnmeteredException({
        source: payload.source || 'council',
        provider: payload.provider,
        model: payload.model,
        task_id: payload.requestId || payload.task_id,
        task_type: payload.taskType || payload.task_type,
        reason: 'savings_ledger_unavailable',
        payload,
      });
      if (strict && !allowUnmetered) {
        throw new Error('TOKEN_ACCOUNTING_STRICT: savings ledger unavailable');
      }
      return { ok: false, unmetered_exception_id: excId, budget };
    }

    try {
      const id = await savingsLedger.record({
        ...payload,
        qualityMethod: payload.qualityMethod || 'token-accounting-os',
      });
      if (!id) {
        throw new Error('ledger returned null id');
      }
      return { ok: true, ledger_id: id, budget };
    } catch (err) {
      const excId = await recordUnmeteredException({
        source: payload.source || 'council',
        provider: payload.provider,
        model: payload.model,
        task_id: payload.requestId || payload.task_id,
        task_type: payload.taskType || payload.task_type,
        reason: 'ledger_write_failed',
        error: err.message,
        payload,
      });
      if (strict && !allowUnmetered) {
        throw err;
      }
      return { ok: false, unmetered_exception_id: excId, error: err.message, budget };
    }
  }

  async function getHealth() {
    const health = {
      status: 'RED',
      council_ledger_active: Boolean(savingsLedger),
      token_usage_log_exists: false,
      token_usage_log_rows_today: 0,
      ocl_exists: false,
      ocl_rows_today: 0,
      conductor_savings_exists: false,
      enhanced_tracker_mounted: false,
      budget_tracker_mounted: true,
      unmetered_calls_today: 0,
      last_ledger_write_at: null,
      strict_mode: strict,
      allow_unmetered: allowUnmetered,
      budget: await checkBudgetGate(),
      blind_spots: [],
    };

    if (!pool) {
      health.blind_spots.push('no_database_pool');
      return health;
    }

    try {
      const tableCheck = await pool.query(
        `SELECT to_regclass('public.token_usage_log') IS NOT NULL AS tul,
                to_regclass('public.operator_consumption_ledger') IS NOT NULL AS ocl,
                to_regclass('public.conductor_session_savings') IS NOT NULL AS css,
                to_regclass('public.ai_unmetered_exceptions') IS NOT NULL AS aue`
      );
      const t = tableCheck.rows[0] || {};
      health.token_usage_log_exists = Boolean(t.tul);
      health.ocl_exists = Boolean(t.ocl);
      health.conductor_savings_exists = Boolean(t.css);

      if (t.tul) {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n, MAX(logged_at) AS last_at
           FROM token_usage_log WHERE logged_at >= NOW() - INTERVAL '24 hours'`
        );
        health.token_usage_log_rows_today = r.rows[0]?.n || 0;
        health.last_ledger_write_at = r.rows[0]?.last_at || null;
      }

      if (t.ocl) {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n FROM operator_consumption_ledger
           WHERE logged_at >= NOW() - INTERVAL '24 hours'`
        );
        health.ocl_rows_today = r.rows[0]?.n || 0;
      }

      if (t.aue) {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n FROM ai_unmetered_exceptions
           WHERE created_at >= NOW() - INTERVAL '24 hours'`
        );
        health.unmetered_calls_today = r.rows[0]?.n || 0;
      }
    } catch (err) {
      health.blind_spots.push(`health_query_error:${err.message}`);
    }

    if (!health.ocl_exists) health.blind_spots.push('operator_consumption_ledger_table_missing');
    if (health.ocl_rows_today === 0) health.blind_spots.push('no_operator_usage_logged_24h');
    if (health.unmetered_calls_today > 0) health.blind_spots.push('unmetered_exceptions_detected');

    if (health.council_ledger_active && health.token_usage_log_exists) {
      if (health.unmetered_calls_today > 0) {
        health.status = 'YELLOW';
      } else if (health.token_usage_log_rows_today > 0 || health.ocl_rows_today > 0) {
        health.status = health.budget.level === 'hard' ? 'RED' : health.budget.level === 'soft' ? 'YELLOW' : 'GREEN';
      } else {
        health.status = 'YELLOW';
        health.blind_spots.push('no_ledger_rows_24h');
      }
    }

    return health;
  }

  async function getUnified({ limit = 100, source_system } = {}) {
    if (!pool) return [];
    const params = [Math.min(Number(limit) || 100, 500)];
    let where = '';
    if (source_system) {
      params.push(source_system);
      where = 'WHERE source_system = $2';
    }
    const { rows } = await pool.query(
      `SELECT * FROM unified_token_accounting_report ${where}
       ORDER BY logged_at DESC LIMIT $1`,
      params
    ).catch(async () => {
      const fallback = await pool.query(
        `SELECT 'token_usage_log' AS source_system, provider, model, task_type AS product_lane,
                request_id AS task_id, input_tokens, output_tokens,
                input_tokens + output_tokens AS total_tokens, saved_tokens,
                cost_usd AS estimated_cost_usd, saved_cost_usd, cache_hit, quality_score, logged_at
         FROM token_usage_log ORDER BY logged_at DESC LIMIT $1`,
        [params[0]]
      );
      return fallback;
    });
    return rows;
  }

  async function getBlindSpots() {
    const health = await getHealth();
    return {
      blind_spots: health.blind_spots,
      health_status: health.status,
      notes: [
        'Cursor/IDE usage requires manual POST /api/v1/tokens/operator/record',
        'Not every code path uses callCouncilMember — unmetered exceptions flag gaps',
      ],
    };
  }

  async function verifyCurrentState() {
    const health = await getHealth();
    let rowCount = 0;
    let minAt = null;
    let maxAt = null;
    let last24h = 0;
    let tsosReportRows = 0;

    if (pool && health.token_usage_log_exists) {
      const stats = await pool.query(
        `SELECT COUNT(*)::bigint AS n, MIN(logged_at) AS min_at, MAX(logged_at) AS max_at
         FROM token_usage_log`
      ).catch(() => ({ rows: [{ n: 0 }] }));
      rowCount = Number(stats.rows[0]?.n || 0);
      minAt = stats.rows[0]?.min_at || null;
      maxAt = stats.rows[0]?.max_at || null;
      last24h = health.token_usage_log_rows_today;

      const tsos = await pool.query('SELECT COUNT(*)::int AS n FROM tsos_savings_report').catch(() => ({ rows: [{ n: 0 }] }));
      tsosReportRows = tsos.rows[0]?.n || 0;
    }

    let label = 'UNVERIFIED';
    if (!pool) label = 'BLOCKED';
    else if (!health.token_usage_log_exists) label = 'BLOCKED';
    else if (rowCount === 0) label = 'PARTIALLY VERIFIED';
    else if (last24h > 0) label = 'VERIFIED';
    else label = 'PARTIALLY VERIFIED';

    return {
      label,
      row_count: rowCount,
      min_logged_at: minAt,
      max_logged_at: maxAt,
      rows_last_24h: last24h,
      tsos_savings_report_rows: tsosReportRows,
      health,
    };
  }

  return {
    strict,
    allowUnmetered,
    recordMeteredCall,
    recordUnmeteredException,
    checkBudgetGate,
    getTodaySpendUsd,
    getHealth,
    getUnified,
    getBlindSpots,
    verifyCurrentState,
    ocl,
  };
}

#!/usr/bin/env node
/**
 * SYNOPSIS: Read-only verification: current Token Accounting OS production state.
 * Read-only verification: current Token Accounting OS production state.
 * Does not fake data — queries DATABASE_URL when available.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

function labelFrom(state) {
  if (state.blocked) return 'BLOCKED';
  if (state.row_count > 0 && state.rows_last_24h > 0) return 'VERIFIED';
  if (state.row_count > 0 || state.tables_present) return 'PARTIALLY VERIFIED';
  return 'UNVERIFIED';
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const out = {
    label: 'BLOCKED',
    database_url_set: Boolean(dbUrl),
    tables: {},
    token_usage_log: { exists: false, row_count: 0, min_logged_at: null, max_logged_at: null, rows_last_24h: 0 },
    tsos_savings_report_rows: 0,
    conductor_session_savings: { exists: false, row_count: 0 },
    token_optimizer_daily: { exists: false, row_count: 0 },
    operator_consumption_ledger: { exists: false, row_count: 0, rows_last_24h: 0 },
    ai_unmetered_exceptions: { exists: false, rows_last_24h: 0 },
    unified_view: { exists: false },
    tracking_active: false,
    notes: [],
  };

  if (!dbUrl) {
    out.notes.push('DATABASE_URL not set — cannot verify production rows');
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: dbUrl.includes('neon') ? { rejectUnauthorized: false } : undefined });

  try {
    const reg = await pool.query(`
      SELECT
        to_regclass('public.token_usage_log') IS NOT NULL AS tul,
        to_regclass('public.tsos_savings_report') IS NOT NULL AS tsos,
        to_regclass('public.conductor_session_savings') IS NOT NULL AS css,
        to_regclass('public.token_optimizer_daily') IS NOT NULL AS tod,
        to_regclass('public.operator_consumption_ledger') IS NOT NULL AS ocl,
        to_regclass('public.ai_unmetered_exceptions') IS NOT NULL AS aue,
        to_regclass('public.unified_token_accounting_report') IS NOT NULL AS uta
    `);
    const t = reg.rows[0];
    out.tables = t;
    out.token_usage_log.exists = Boolean(t.tul);
    out.conductor_session_savings.exists = Boolean(t.css);
    out.token_optimizer_daily.exists = Boolean(t.tod);
    out.operator_consumption_ledger.exists = Boolean(t.ocl);
    out.ai_unmetered_exceptions.exists = Boolean(t.aue);
    out.unified_view.exists = Boolean(t.uta);

    if (t.tul) {
      const stats = await pool.query(`
        SELECT COUNT(*)::bigint AS n, MIN(logged_at) AS min_at, MAX(logged_at) AS max_at,
               COUNT(*) FILTER (WHERE logged_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
        FROM token_usage_log
      `);
      const s = stats.rows[0];
      out.token_usage_log.row_count = Number(s.n);
      out.token_usage_log.min_logged_at = s.min_at;
      out.token_usage_log.max_logged_at = s.max_at;
      out.token_usage_log.rows_last_24h = Number(s.last_24h);
    }

    if (t.tsos) {
      const tsos = await pool.query('SELECT COUNT(*)::int AS n FROM tsos_savings_report');
      out.tsos_savings_report_rows = tsos.rows[0]?.n || 0;
    }

    if (t.css) {
      const css = await pool.query('SELECT COUNT(*)::int AS n FROM conductor_session_savings');
      out.conductor_session_savings.row_count = css.rows[0]?.n || 0;
    }

    if (t.tod) {
      const tod = await pool.query('SELECT COUNT(*)::int AS n FROM token_optimizer_daily');
      out.token_optimizer_daily.row_count = tod.rows[0]?.n || 0;
    }

    if (t.ocl) {
      const ocl = await pool.query(`
        SELECT COUNT(*)::int AS n,
               COUNT(*) FILTER (WHERE logged_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
        FROM operator_consumption_ledger
      `);
      out.operator_consumption_ledger.row_count = ocl.rows[0]?.n || 0;
      out.operator_consumption_ledger.rows_last_24h = ocl.rows[0]?.last_24h || 0;
    }

    if (t.aue) {
      const aue = await pool.query(`
        SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
        FROM ai_unmetered_exceptions
      `);
      out.ai_unmetered_exceptions.rows_last_24h = aue.rows[0]?.last_24h || 0;
    }

    out.tracking_active = out.token_usage_log.rows_last_24h > 0;
    out.tables_present = Object.values(t).some(Boolean);
    out.blocked = !out.token_usage_log.exists;
    out.label = labelFrom({
      blocked: out.blocked,
      row_count: out.token_usage_log.row_count,
      rows_last_24h: out.token_usage_log.rows_last_24h,
      tables_present: out.tables_present,
    });

    if (out.token_usage_log.row_count === 0) {
      out.notes.push('token_usage_log exists but has zero rows — schema only until first AI call');
    }
    if (!out.operator_consumption_ledger.exists) {
      out.notes.push('operator_consumption_ledger migration not applied yet');
    }
    if (out.ai_unmetered_exceptions.rows_last_24h > 0) {
      out.notes.push('unmetered exceptions detected in last 24h — enforcement gaps');
    }
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.label === 'VERIFIED' ? 0 : out.label === 'BLOCKED' ? 2 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ label: 'BLOCKED', error: err.message }, null, 2));
  process.exit(2);
});

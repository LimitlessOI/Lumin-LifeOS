#!/usr/bin/env node
/**
 * SYNOPSIS: Kernel health summary — local DB + optional deploy probe Kernel health summary — local DB + optional deploy probe */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const out = { status: 'RED', kernel: 'phase0', token: null, control_plane: null, db: {} };
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl, ssl: dbUrl.includes('neon') ? { rejectUnauthorized: false } : undefined });
    try {
      const reg = await pool.query(`
        SELECT
          to_regclass('public.build_task_ledger') IS NOT NULL AS btl,
          to_regclass('public.unified_token_accounting_report') IS NOT NULL AS uta,
          to_regclass('public.ai_unmetered_exceptions') IS NOT NULL AS aue
      `);
      out.db = reg.rows[0];
    } finally {
      await pool.end();
    }
  }
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;
  if (base && key) {
    for (const [k, path] of [
      ['kernel', '/api/v1/kernel/health'],
      ['token', '/api/v1/tokens/unified/health'],
      ['control_plane', '/api/v1/builderos/control-plane/health'],
    ]) {
      try {
        const res = await fetch(`${base}${path}`, { headers: { 'x-command-key': key } });
        out[k] = res.ok ? await res.json() : { ok: false, status: res.status };
      } catch (err) {
        out[k] = { ok: false, error: err.message };
      }
    }
  }
  if (out.kernel?.status && out.kernel.status !== 'RED') out.status = 'YELLOW';
  if (out.token?.status === 'GREEN' || out.token?.status === 'YELLOW') out.status = 'YELLOW';
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

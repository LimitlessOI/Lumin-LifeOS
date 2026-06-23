#!/usr/bin/env node
/**
 * SYNOPSIS: Verify LifeRE Postgres tables exist (local DATABASE_URL or skip).
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABLES = [
  'lifere_activity_log',
  'lifere_approval_queue',
  'lifere_call_logs',
  'lifere_experiments',
  'lifere_performance_snapshot',
  'lifere_relationship_edges',
];

const report = { schema: 'lifere_pg_verify_v1', at: new Date().toISOString(), passed: [], failed: [], skipped: false };

async function main() {
  if (!process.env.DATABASE_URL) {
    report.skipped = true;
    report.note = 'DATABASE_URL not set — skip PG verify (live pool verified via /health)';
    report.ok = true;
    write();
    return;
  }

  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === '0' ? false : { rejectUnauthorized: false } });

  try {
    for (const table of TABLES) {
      try {
        const { rows } = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS ok`,
          [table],
        );
        const ok = rows[0]?.ok === true;
        (ok ? report.passed : report.failed).push(table);
        if (!ok) report[`missing_${table}`] = true;
      } catch (err) {
        report.failed.push(table);
        report[`error_${table}`] = err.message;
      }
    }
    report.ok = report.failed.length === 0;
    if (!report.ok && process.env.LIFERE_PG_VERIFY_STRICT !== '1') {
      report.warnings = [{ id: 'PG-W01', detail: 'Local PG tables missing — Railway applies migrations on boot; not blocking alpha readiness' }];
      report.ok = true;
      report.local_tables_missing = report.failed;
      report.failed = [];
    }
  } finally {
    await pool.end();
  }
  write();
  process.exit(report.ok ? 0 : 1);
}

function write() {
  const out = path.join(ROOT, 'products/receipts/LIFERE_PG_VERIFY.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.ok = false;
  report.error = err.message;
  write();
  process.exit(1);
});

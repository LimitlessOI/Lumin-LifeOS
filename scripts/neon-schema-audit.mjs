#!/usr/bin/env node
/**
 * SYNOPSIS: Audit Neon public schema — classify tables for keep vs archive.
 * Usage: node scripts/neon-schema-audit.mjs [--write]
 * @ssot docs/database/README.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CODE_DIRS = ['services', 'routes', 'scripts', 'startup', 'core', 'middleware', 'db/migrations'];

function walkCode() {
  const chunks = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules') continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(js|mjs|sql)$/.test(ent.name)) chunks.push(fs.readFileSync(p, 'utf8'));
    }
  };
  for (const d of CODE_DIRS) walk(path.join(ROOT, d));
  return chunks.join('\n');
}

function loadManifestText() {
  const products = path.join(ROOT, 'docs/products');
  if (!fs.existsSync(products)) return '';
  return fs.readdirSync(products, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const mf = path.join(products, e.name, 'FILE_MANIFEST.json');
      return fs.existsSync(mf) ? fs.readFileSync(mf, 'utf8') : '';
    })
    .join('\n');
}

function referenced(name, haystack) {
  return new RegExp(`\\b${name}\\b`, 'i').test(haystack);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const { rows } = await pool.query(`
    SELECT c.relname AS table_name,
           COALESCE(s.n_live_tup, 0)::bigint AS est_rows,
           pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY est_rows DESC, c.relname
  `);
  await pool.end();

  const haystack = `${walkCode()}\n${loadManifestText()}`;
  const tables = rows.map((r) => {
    const est = Number(r.est_rows);
    const ref = referenced(r.table_name, haystack);
    let tier = 'KEEP';
    if (!ref && est === 0) tier = 'ARCHIVE_CANDIDATE';
    else if (!ref && est > 0) tier = 'REVIEW';
    else if (ref && est === 0) tier = 'SCHEMA_READY';
    return { table: r.table_name, rows: est, kb: Math.round(Number(r.bytes) / 1024), referenced: ref, tier };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    total: tables.length,
    with_data: tables.filter((t) => t.rows > 0).length,
    schema_ready: tables.filter((t) => t.tier === 'SCHEMA_READY').length,
    archive_candidate: tables.filter((t) => t.tier === 'ARCHIVE_CANDIDATE').length,
    review: tables.filter((t) => t.tier === 'REVIEW').length,
  };

  const report = { summary, tables };
  const outPath = path.join(ROOT, 'data/neon-schema-audit.json');
  if (WRITE) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
  console.log('\nArchive candidates:', tables.filter((t) => t.tier === 'ARCHIVE_CANDIDATE').map((t) => t.table).join(', '));
  console.log('\nReview (has rows, weak code ref):', tables.filter((t) => t.tier === 'REVIEW').slice(0, 20).map((t) => `${t.table}(${t.rows})`).join(', '));
  if (!WRITE) console.log('\nRun with --write to save data/neon-schema-audit.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

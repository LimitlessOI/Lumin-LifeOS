#!/usr/bin/env node
/**
 * SYNOPSIS: Fail-closed static pre-flight for db/migrations/*.sql (idempotency + collision risk).
 * Wave 0 item 13 — Migration pre-flight validator.
 * Exit 0 = PASS, 1 = FAIL. No DB required.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MIGRATIONS_DIR = path.join(ROOT, 'db/migrations');
const DEFAULT_ALLOWLIST = path.join(ROOT, 'config/migration-preflight-collision-allowlist.json');
const ALLOW_BANNER = /--\s*ALLOW_DESTRUCTIVE_MIGRATION\b/;

/**
 * Strip SQL line/block comments while preserving string literals.
 * @param {string} sql
 * @returns {string}
 */
export function stripSqlComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (sql[i] === "'") {
      out += sql[i];
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          out += "''";
          i += 2;
          continue;
        }
        out += sql[i];
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += sql[i];
    i += 1;
  }
  return out;
}

/**
 * Parse a SQL identifier (optionally schema-qualified) from the start of `s`.
 * @param {string} s
 * @returns {string|null} lowercased bare or schema.table
 */
export function parseSqlIdent(s) {
  const m = String(s || '')
    .trim()
    .match(/^("([^"]+)"|([a-zA-Z_][\w]*))(\s*\.\s*("([^"]+)"|([a-zA-Z_][\w]*)))?/);
  if (!m) return null;
  const a = (m[2] || m[3]).toLowerCase();
  const b = m[5] ? (m[6] || m[7]).toLowerCase() : null;
  return b ? `${a}.${b}` : a;
}

/**
 * @param {string} name
 * @returns {string}
 */
export function bareTableName(name) {
  if (!name) return '';
  return name.includes('.') ? name.split('.').pop() : name;
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function hasDestructiveAllowBanner(raw) {
  const head = String(raw || '').split('\n').slice(0, 20).join('\n');
  return ALLOW_BANNER.test(head);
}

/**
 * @param {string} allowlistPath
 * @returns {Set<string>}
 */
export function loadCollisionAllowlist(allowlistPath) {
  const set = new Set();
  if (!allowlistPath || !fs.existsSync(allowlistPath)) return set;
  const data = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  for (const p of data.pairs || []) {
    if (!p?.table || !p?.first_file || !p?.second_file) continue;
    set.add(`${p.table}|${p.first_file}|${p.second_file}`);
  }
  return set;
}

/**
 * A CREATE TABLE with no literal IF NOT EXISTS can still be safely idempotent
 * when it's wrapped in a PL/pgSQL DO $$ block guarded by
 * `IF to_regclass('table') IS NULL THEN ... CREATE TABLE ... END IF`. That's
 * a real, deliberate pattern used in this repo (e.g. db/migrations/
 * 20260719b_lifeos_lab_results_repair.sql) — functionally equivalent safety,
 * expressed at the PL/pgSQL control-flow level instead of the SQL clause
 * level. The static scanner only understood the SQL-clause form; this
 * recognizes the DO-block form too rather than false-positiving on it.
 * @param {string} sql
 * @param {number} matchIndex
 * @param {string} tableName
 * @returns {boolean}
 */
export function hasToRegclassGuard(sql, matchIndex, tableName) {
  const bare = bareTableName(tableName);
  // Find the nearest enclosing DO $...$ block start before matchIndex.
  const doBlockRe = /\bDO\s+\$(\w*)\$/gi;
  let lastDoStart = -1;
  let dm;
  while ((dm = doBlockRe.exec(sql)) !== null) {
    if (dm.index >= matchIndex) break;
    // Confirm this DO block hasn't already closed before matchIndex.
    const closeRe = new RegExp(`\\$${dm[1]}\\$\\s*;`, 'i');
    const closeMatch = closeRe.exec(sql.slice(dm.index + dm[0].length));
    const closeIndex = closeMatch ? dm.index + dm[0].length + closeMatch.index : -1;
    if (closeIndex === -1 || closeIndex >= matchIndex) {
      lastDoStart = dm.index;
    }
  }
  if (lastDoStart === -1) return false;
  const blockText = sql.slice(lastDoStart, matchIndex);
  const guardRe = new RegExp(
    `to_regclass\\s*\\(\\s*'(?:public\\.)?${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*\\)\\s+IS\\s+NULL`,
    'i',
  );
  return guardRe.test(blockText);
}

/**
 * Scan migration SQL text for pre-flight findings.
 * @param {{ file: string, raw: string }} file
 * @returns {{ failures: object[], warnings: object[] }}
 */
export function scanMigrationSql({ file, raw }) {
  const failures = [];
  const warnings = [];
  if (!String(raw || '').trim()) {
    return { failures, warnings };
  }

  const allowDestructive = hasDestructiveAllowBanner(raw);
  const sql = stripSqlComments(raw);

  const createTableRe = /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?/gi;
  let m;
  while ((m = createTableRe.exec(sql)) !== null) {
    const hasIf = Boolean(m[1]);
    const name = parseSqlIdent(sql.slice(m.index + m[0].length));
    if (!name) continue;
    if (!hasIf && !hasToRegclassGuard(sql, m.index, name)) {
      failures.push({
        code: 'CREATE_TABLE_MISSING_IF_NOT_EXISTS',
        file,
        table: bareTableName(name),
        detail: `CREATE TABLE ${name} without IF NOT EXISTS`,
      });
    }
  }

  const createIndexRe =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(CONCURRENTLY\s+)?(IF\s+NOT\s+EXISTS\s+)?/gi;
  while ((m = createIndexRe.exec(sql)) !== null) {
    if (m[3]) continue;
    const snippet = sql.slice(m.index, m.index + 100).replace(/\s+/g, ' ').trim();
    failures.push({
      code: 'CREATE_INDEX_MISSING_IF_NOT_EXISTS',
      file,
      detail: snippet,
    });
  }

  if (/\bDROP\s+(TABLE|SCHEMA)\b/i.test(sql) && !allowDestructive) {
    failures.push({
      code: 'DROP_WITHOUT_ALLOW_BANNER',
      file,
      detail: 'DROP TABLE/SCHEMA requires -- ALLOW_DESTRUCTIVE_MIGRATION banner in first 20 lines',
    });
  }

  if (/\bTRUNCATE\b/i.test(sql) && !allowDestructive) {
    failures.push({
      code: 'TRUNCATE_WITHOUT_ALLOW_BANNER',
      file,
      detail: 'TRUNCATE requires -- ALLOW_DESTRUCTIVE_MIGRATION banner in first 20 lines',
    });
  }

  const alterRe =
    /ALTER\s+TABLE\s+[\w."]+(?:\s*\.\s*[\w."]+)?\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/gi;
  while ((m = alterRe.exec(sql)) !== null) {
    const snippet = sql.slice(m.index, m.index + 90).replace(/\s+/g, ' ').trim();
    warnings.push({
      code: 'ALTER_ADD_COLUMN_MISSING_IF_NOT_EXISTS',
      file,
      detail: snippet,
    });
  }

  return { failures, warnings };
}

/**
 * Collect CREATE TABLE introductions across files for collision detection.
 * @param {Array<{ file: string, raw: string }>} files
 * @returns {Array<{ table: string, first_file: string, second_file: string }>}
 */
export function findCreateTableCollisions(files) {
  const first = new Map();
  const collisions = [];
  const seen = new Set();

  for (const { file, raw } of files) {
    if (!String(raw || '').trim()) continue;
    const sql = stripSqlComments(raw);
    const createTableRe = /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?/gi;
    let m;
    while ((m = createTableRe.exec(sql)) !== null) {
      const name = parseSqlIdent(sql.slice(m.index + m[0].length));
      if (!name) continue;
      const table = bareTableName(name);
      if (first.has(table) && first.get(table) !== file) {
        const key = `${table}|${first.get(table)}|${file}`;
        if (!seen.has(key)) {
          seen.add(key);
          collisions.push({
            table,
            first_file: first.get(table),
            second_file: file,
          });
        }
      } else if (!first.has(table)) {
        first.set(table, file);
      }
    }
  }

  return collisions;
}

/**
 * Run full pre-flight over a migrations directory.
 * @param {{ migrationsDir?: string, allowlistPath?: string|null }} [opts]
 * @returns {{ ok: boolean, failures: object[], warnings: object[], scanned: number }}
 */
export function runMigrationPreflight(opts = {}) {
  const migrationsDir = opts.migrationsDir || DEFAULT_MIGRATIONS_DIR;
  const allowlistPath =
    opts.allowlistPath === undefined ? DEFAULT_ALLOWLIST : opts.allowlistPath;
  const allow = loadCollisionAllowlist(allowlistPath);

  const names = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const files = [];
  const failures = [];
  const warnings = [];

  for (const name of names) {
    const raw = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    if (!raw.trim()) continue;
    files.push({ file: name, raw });
    const scanned = scanMigrationSql({ file: name, raw });
    failures.push(...scanned.failures);
    warnings.push(...scanned.warnings);
  }

  for (const c of findCreateTableCollisions(files)) {
    const key = `${c.table}|${c.first_file}|${c.second_file}`;
    if (allow.has(key)) continue;
    failures.push({
      code: 'CREATE_TABLE_COLLISION_RISK',
      file: c.second_file,
      table: c.table,
      detail: `CREATE TABLE ${c.table} also in ${c.first_file} (first) → ${c.second_file}`,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    scanned: files.length,
  };
}

function printReport(result) {
  if (result.warnings.length) {
    console.log(`MIGRATION PREFLIGHT: ${result.warnings.length} warning(s)`);
    for (const w of result.warnings) {
      console.log(`  WARN ${w.code} ${w.file}: ${w.detail}`);
    }
  }

  if (!result.ok) {
    console.error(`MIGRATION PREFLIGHT: FAIL (${result.failures.length} finding(s), scanned=${result.scanned})`);
    for (const f of result.failures) {
      const table = f.table ? ` table=${f.table}` : '';
      console.error(`  FAIL ${f.code} ${f.file}${table}: ${f.detail}`);
    }
    return;
  }

  console.log(
    `MIGRATION PREFLIGHT: PASS (scanned=${result.scanned}, warnings=${result.warnings.length})`,
  );
}

function main() {
  const result = runMigrationPreflight();
  printReport(result);
  process.exit(result.ok ? 0 : 1);
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main();
}

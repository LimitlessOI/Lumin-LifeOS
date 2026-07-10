#!/usr/bin/env node
/**
 * SYNOPSIS: Fail-closed static lint for data-loss / non-idempotent DML in db/migrations/*.sql.
 * Wave 0 item 14 — Migration idempotency / data-loss lint.
 * Does NOT duplicate item 13 CREATE IF NOT EXISTS / DROP TABLE / collision rules.
 * Exit 0 = PASS, 1 = FAIL. No DB required.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stripSqlComments,
  hasDestructiveAllowBanner,
} from './verify-migration-preflight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MIGRATIONS_DIR = path.join(ROOT, 'db/migrations');
const ALLOW_RENAME_BANNER = /--\s*ALLOW_RENAME_MIGRATION\b/;

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function hasRenameAllowBanner(raw) {
  const head = String(raw || '').split('\n').slice(0, 20).join('\n');
  return ALLOW_RENAME_BANNER.test(head);
}

/**
 * Statement text from `start` through the next top-level semicolon (strings ignored).
 * @param {string} sql
 * @param {number} start
 * @returns {string}
 */
export function sliceSqlStatement(sql, start) {
  let i = start;
  let inStr = false;
  while (i < sql.length) {
    const ch = sql[i];
    if (inStr) {
      if (ch === "'" && sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") inStr = false;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      i += 1;
      continue;
    }
    if (ch === ';') break;
    i += 1;
  }
  return sql.slice(start, i);
}

/**
 * @param {string} sql
 * @param {number} index
 * @returns {string}
 */
function precedingTokenRegion(sql, index) {
  return sql.slice(Math.max(0, index - 48), index);
}

/**
 * True when this UPDATE is trigger/FK/ON CONFLICT DO UPDATE, not a table UPDATE.
 * @param {string} sql
 * @param {number} index
 * @returns {boolean}
 */
export function isNonTableUpdate(sql, index) {
  const before = precedingTokenRegion(sql, index);
  if (/\b(BEFORE|AFTER|INSTEAD\s+OF)\s+$/i.test(before)) return true;
  if (/\bON\s+$/i.test(before)) return true;
  const after = sql.slice(index + 'UPDATE'.length);
  if (/^\s+SET\b/i.test(after)) return true;
  return false;
}

/**
 * Scan migration SQL for data-loss / non-idempotent DML findings.
 * @param {{ file: string, raw: string }} file
 * @returns {{ failures: object[], warnings: object[] }}
 */
export function scanMigrationIdempotency({ file, raw }) {
  const failures = [];
  const warnings = [];
  if (!String(raw || '').trim()) {
    return { failures, warnings };
  }

  const allowDestructive = hasDestructiveAllowBanner(raw);
  const allowRename = hasRenameAllowBanner(raw);
  const sql = stripSqlComments(raw);

  const deleteRe = /\bDELETE\s+FROM\b/gi;
  let m;
  while ((m = deleteRe.exec(sql)) !== null) {
    const stmt = sliceSqlStatement(sql, m.index);
    if (/\bWHERE\b/i.test(stmt)) continue;
    const snippet = stmt.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (allowDestructive) {
      warnings.push({
        code: 'DELETE_WITHOUT_WHERE_ALLOWED',
        file,
        detail: snippet,
      });
    } else {
      failures.push({
        code: 'DELETE_WITHOUT_WHERE',
        file,
        detail: `${snippet} — add WHERE or -- ALLOW_DESTRUCTIVE_MIGRATION`,
      });
    }
  }

  const updateRe = /\bUPDATE\b/gi;
  while ((m = updateRe.exec(sql)) !== null) {
    if (isNonTableUpdate(sql, m.index)) continue;
    const stmt = sliceSqlStatement(sql, m.index);
    if (!/\bSET\b/i.test(stmt)) continue;
    if (/\bWHERE\b/i.test(stmt)) continue;
    const snippet = stmt.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (allowDestructive) {
      warnings.push({
        code: 'UPDATE_WITHOUT_WHERE_ALLOWED',
        file,
        detail: snippet,
      });
    } else {
      failures.push({
        code: 'UPDATE_WITHOUT_WHERE',
        file,
        detail: `${snippet} — add WHERE or -- ALLOW_DESTRUCTIVE_MIGRATION`,
      });
    }
  }

  const dropColRe = /\bDROP\s+COLUMN\b/gi;
  while ((m = dropColRe.exec(sql)) !== null) {
    const chunk = sql.slice(m.index, m.index + 96);
    if (/^DROP\s+COLUMN\s+IF\s+EXISTS\b/i.test(chunk)) continue;
    const snippet = chunk.replace(/\s+/g, ' ').trim().slice(0, 100);
    failures.push({
      code: 'DROP_COLUMN_MISSING_IF_EXISTS',
      file,
      detail: `${snippet} — use DROP COLUMN IF EXISTS (PG 15+)`,
    });
  }

  const alterTypeRe = /\bALTER\s+COLUMN\s+[\w."]+\s+TYPE\b/gi;
  while ((m = alterTypeRe.exec(sql)) !== null) {
    const stmt = sliceSqlStatement(sql, m.index);
    if (/\bUSING\b/i.test(stmt)) continue;
    const snippet = stmt.replace(/\s+/g, ' ').trim().slice(0, 120);
    failures.push({
      code: 'ALTER_COLUMN_TYPE_MISSING_USING',
      file,
      detail: `${snippet} — add USING clause for explicit cast`,
    });
  }

  const renameRe =
    /\b(?:ALTER\s+TABLE\s+[\w."]+(?:\s*\.\s*[\w."]+)?\s+RENAME\s+(?:COLUMN\s+[\w."]+\s+TO\s+[\w."]+|TO\s+[\w."]+)|RENAME\s+TABLE\s+[\w."]+(?:\s*\.\s*[\w."]+)?\s+TO\s+[\w."]+)/gi;
  while ((m = renameRe.exec(sql)) !== null) {
    const snippet = m[0].replace(/\s+/g, ' ').trim().slice(0, 120);
    if (allowRename) {
      warnings.push({
        code: 'RENAME_ALLOWED',
        file,
        detail: snippet,
      });
    } else {
      warnings.push({
        code: 'RENAME_WITHOUT_ALLOW_BANNER',
        file,
        detail: `${snippet} — add -- ALLOW_RENAME_MIGRATION if intentional`,
      });
    }
  }

  const insertRe = /\bINSERT\s+INTO\b/gi;
  while ((m = insertRe.exec(sql)) !== null) {
    const stmt = sliceSqlStatement(sql, m.index);
    if (/\bON\s+CONFLICT\b/i.test(stmt)) continue;
    const snippet = stmt.replace(/\s+/g, ' ').trim().slice(0, 120);
    warnings.push({
      code: 'INSERT_MISSING_ON_CONFLICT',
      file,
      detail: snippet,
    });
  }

  return { failures, warnings };
}

/**
 * Run idempotency / data-loss lint over a migrations directory.
 * @param {{ migrationsDir?: string }} [opts]
 * @returns {{ ok: boolean, failures: object[], warnings: object[], scanned: number }}
 */
export function runMigrationIdempotency(opts = {}) {
  const migrationsDir = opts.migrationsDir || DEFAULT_MIGRATIONS_DIR;
  const names = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const failures = [];
  const warnings = [];
  let scanned = 0;

  for (const name of names) {
    const raw = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    if (!raw.trim()) continue;
    scanned += 1;
    const result = scanMigrationIdempotency({ file: name, raw });
    failures.push(...result.failures);
    warnings.push(...result.warnings);
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    scanned,
  };
}

function printReport(result) {
  if (result.warnings.length) {
    console.log(`MIGRATION IDEMPOTENCY: ${result.warnings.length} warning(s)`);
    for (const w of result.warnings) {
      console.log(`  WARN ${w.code} ${w.file}: ${w.detail}`);
    }
  }

  if (!result.ok) {
    console.error(
      `MIGRATION IDEMPOTENCY: FAIL (${result.failures.length} finding(s), scanned=${result.scanned})`,
    );
    for (const f of result.failures) {
      console.error(`  FAIL ${f.code} ${f.file}: ${f.detail}`);
    }
    return;
  }

  console.log(
    `MIGRATION IDEMPOTENCY: PASS (scanned=${result.scanned}, warnings=${result.warnings.length})`,
  );
}

function main() {
  const result = runMigrationIdempotency();
  printReport(result);
  process.exit(result.ok ? 0 : 1);
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main();
}

/**
 * SYNOPSIS: Migration-truth primitives — prove a migration did what it claimed.
 *
 * Audited 2026-07-28 against the live runner (startup/database.js, called from
 * server-founder-runtime.js:410). Two drift sources found:
 *
 * 1. "Applied" meant "pool.query did not throw". Nothing ever confirmed the
 *    intended table/column/index now exists.
 * 2. A failure matching /already exists/ marks the file applied. Because a
 *    multi-statement string is sent as one simple query, Postgres wraps it in an
 *    implicit transaction — so that failure rolls the WHOLE file back, and the
 *    statements after the conflicting one never run, yet the file is recorded
 *    applied forever. A migration can be "done" having changed nothing.
 *
 * Identity was also filename-only: editing an applied migration diverges git
 * from the live schema permanently and silently. Checksums close that.
 *
 * Assertions are opt-in per file, so no existing migration changes behaviour.
 * Declare them as SQL comments:
 *   -- @assert table:public.my_table
 *   -- @assert column:public.my_table.my_column
 *   -- @assert index:idx_my_table_my_column
 *
 * @ssot docs/products/financial-revenue/PRODUCT_HOME.md
 */
import { createHash } from 'node:crypto';

export const ASSERTION_KIND = {
  TABLE: 'table',
  COLUMN: 'column',
  INDEX: 'index',
};

export function checksumMigration(sql) {
  return createHash('sha256').update(String(sql ?? ''), 'utf8').digest('hex');
}

const ASSERT_LINE = /^\s*--\s*@assert\s+([a-z]+)\s*:\s*([A-Za-z0-9_.]+)\s*$/;

/**
 * Extract declared post-apply expectations from a migration's comments.
 * Unknown kinds and malformed targets are returned as `invalid` rather than
 * silently dropped — a typo in an assertion must not read as "nothing to check".
 */
export function parseAssertions(sql) {
  const assertions = [];
  const invalid = [];
  for (const rawLine of String(sql ?? '').split('\n')) {
    if (!/@assert/.test(rawLine)) continue;
    const m = rawLine.match(ASSERT_LINE);
    if (!m) {
      invalid.push({ line: rawLine.trim(), reason: 'malformed @assert directive' });
      continue;
    }
    const kind = m[1].toLowerCase();
    const parts = m[2].split('.');
    if (kind === ASSERTION_KIND.TABLE) {
      if (parts.length === 1) assertions.push({ kind, schema: 'public', table: parts[0] });
      else if (parts.length === 2) assertions.push({ kind, schema: parts[0], table: parts[1] });
      else invalid.push({ line: rawLine.trim(), reason: 'table assertion wants [schema.]table' });
    } else if (kind === ASSERTION_KIND.COLUMN) {
      if (parts.length === 2) assertions.push({ kind, schema: 'public', table: parts[0], column: parts[1] });
      else if (parts.length === 3) assertions.push({ kind, schema: parts[0], table: parts[1], column: parts[2] });
      else invalid.push({ line: rawLine.trim(), reason: 'column assertion wants [schema.]table.column' });
    } else if (kind === ASSERTION_KIND.INDEX) {
      if (parts.length === 1) assertions.push({ kind, schema: 'public', index: parts[0] });
      else if (parts.length === 2) assertions.push({ kind, schema: parts[0], index: parts[1] });
      else invalid.push({ line: rawLine.trim(), reason: 'index assertion wants [schema.]index' });
    } else {
      invalid.push({ line: rawLine.trim(), reason: `unknown assertion kind "${kind}"` });
    }
  }
  return { assertions, invalid };
}

/** Read-only existence probe for one assertion. Never mutates. */
export function assertionQuery(assertion) {
  switch (assertion.kind) {
    case ASSERTION_KIND.TABLE:
      return {
        sql: 'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1',
        params: [assertion.schema, assertion.table],
      };
    case ASSERTION_KIND.COLUMN:
      return {
        sql: 'SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 '
          + 'AND column_name = $3 LIMIT 1',
        params: [assertion.schema, assertion.table, assertion.column],
      };
    case ASSERTION_KIND.INDEX:
      return {
        sql: 'SELECT 1 FROM pg_indexes WHERE schemaname = $1 AND indexname = $2 LIMIT 1',
        params: [assertion.schema, assertion.index],
      };
    default:
      throw new Error(`unsupported assertion kind: ${assertion.kind}`);
  }
}

export function describeAssertion(assertion) {
  if (assertion.kind === ASSERTION_KIND.TABLE) return `table ${assertion.schema}.${assertion.table}`;
  if (assertion.kind === ASSERTION_KIND.COLUMN) {
    return `column ${assertion.schema}.${assertion.table}.${assertion.column}`;
  }
  if (assertion.kind === ASSERTION_KIND.INDEX) return `index ${assertion.schema}.${assertion.index}`;
  return JSON.stringify(assertion);
}

/**
 * Run every declared assertion with a read-only query function.
 * @param {(sql: string, params: any[]) => Promise<{rowCount: number}>} query
 */
export async function verifyAssertions(assertions, query) {
  const satisfied = [];
  const missing = [];
  const errored = [];
  for (const assertion of assertions) {
    const { sql, params } = assertionQuery(assertion);
    try {
      const res = await query(sql, params);
      const found = Number(res?.rowCount ?? (Array.isArray(res?.rows) ? res.rows.length : 0)) > 0;
      if (found) satisfied.push(describeAssertion(assertion));
      else missing.push(describeAssertion(assertion));
    } catch (err) {
      errored.push({ assertion: describeAssertion(assertion), error: err?.message || String(err) });
    }
  }
  return { ok: missing.length === 0 && errored.length === 0, satisfied, missing, errored };
}

/**
 * Was an already-applied migration's content edited after the fact?
 * Null recorded checksum means the row predates checksum tracking — unknown, not drifted.
 */
export function detectChecksumDrift(recordedChecksum, currentSql) {
  if (!recordedChecksum) return { drifted: false, known: false, current: checksumMigration(currentSql) };
  const current = checksumMigration(currentSql);
  return { drifted: current !== recordedChecksum, known: true, current, recorded: recordedChecksum };
}

export function checksumDriftSolution(filename) {
  return (
    `${filename} was edited after it was applied, so the live schema no longer matches this file and never will `
    + '(the runner skips applied filenames). Do not edit applied migrations. Write a NEW migration that makes the '
    + 'intended change, and if the edit was cosmetic, reconcile the recorded checksum deliberately.'
  );
}

export function assertionFailureSolution(filename, missing) {
  return (
    `${filename} ran without throwing but its declared end state is absent: ${missing.join(', ')}. `
    + 'Most often the file failed partway and Postgres rolled the whole simple-query batch back, or the SQL does '
    + 'not create what the assertion names. Fix the SQL (or the assertion if it names the wrong object) and let it '
    + 'retry — it has deliberately NOT been marked applied.'
  );
}

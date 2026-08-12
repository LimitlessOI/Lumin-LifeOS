/**
 * SYNOPSIS: Repair overlay-style bind migrations that RAISE EXCEPTION when the
 * target table is not present yet — a boot-crashing defect when the file is
 * dated before the table's CREATE.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

const RAISE_RE = /IF to_regclass\('public\.([^']+)'\) IS NULL THEN\s*RAISE EXCEPTION [^;]+;/gi;

export function isBindBeforeCreateFailure(message) {
  return /Binding target table/i.test(String(message || ''));
}

export function needsBindMigrationRepair(sql) {
  return /to_regclass\(/i.test(sql) && /RAISE EXCEPTION/i.test(sql);
}

export function repairBindMigrationSql(sql) {
  if (!needsBindMigrationRepair(sql)) return { changed: false, sql };
  let out = String(sql);
  out = out.replace(RAISE_RE, (_m, table) => (
    `IF to_regclass('public.${table}') IS NULL THEN\n    RAISE NOTICE 'Taloa bind deferred: ${table} not present yet';\n    RETURN;`
  ));
  // COMMENT ON TABLE outside the DO block still crashes if the table is missing.
  out = out.replace(
    /\nCOMMENT ON TABLE (\w+) IS ('(?:\\'|[^'])*');\s*$/m,
    (_m, table, comment) => `\n  EXECUTE format('COMMENT ON TABLE %I IS %L', '${table}', ${comment});`,
  );
  return { changed: out !== sql, sql: out };
}

export function classifyHealthRepair(health) {
  const report = health?.body?.startup?.startup_report
    || health?.body?.startup_report
    || {};
  const failed = Array.isArray(report.migrations_failed) ? report.migrations_failed : [];
  const reasons = Array.isArray(report.reasons) ? report.reasons : [];
  const migrationReason = reasons.some((r) => String(r).includes('migrations_failed'));
  if (failed.length || migrationReason) {
    return { repair_id: 'DR-BIND-MIGRATION', migrations_failed: failed };
  }
  return null;
}

export function repairBindMigrationsInRepo(repoRoot, failedNames = []) {
  const dir = path.join(repoRoot, 'db/migrations');
  if (!fs.existsSync(dir)) return [];
  const names = failedNames.length
    ? failedNames.map((n) => path.basename(String(n)))
    : fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
  const changed = [];
  for (const name of names) {
    const abs = path.join(dir, name);
    if (!fs.existsSync(abs)) continue;
    const sql = fs.readFileSync(abs, 'utf8');
    const result = repairBindMigrationSql(sql);
    if (result.changed) {
      fs.writeFileSync(abs, result.sql);
      changed.push(`db/migrations/${name}`);
    }
  }
  return changed;
}

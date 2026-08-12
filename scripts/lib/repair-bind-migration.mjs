/**
 * SYNOPSIS: Repair overlay-style bind migrations that RAISE EXCEPTION when the
 * target table is not present yet — a boot-crashing defect when the file is
 * dated before the table's CREATE.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
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

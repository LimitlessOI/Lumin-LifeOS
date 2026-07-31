/**
 * SYNOPSIS: Deterministic static grounding check for generated artifacts before
 * they may be sealed or marked done. Verifies that named imports resolve to actual
 * exports in the referenced source modules and that SQL table references exist in
 * the authoritative schema. Returns PASS, FAIL, or INDETERMINATE.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_CONTENT_LENGTH = 2 * 1024 * 1024;
const SQL_KEYWORDS = /\b(?:select|insert|update|delete|create\s+table|drop\s+table|alter\s+table|from|join|into|where|with)\b/i;
const SYSTEM_SCHEMAS = new Set(['information_schema', 'pg_catalog', 'pg_toast']);
const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
  'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch',
  'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function log(logger, level, msg) {
  if (logger?.[level]) logger[level](msg);
}

function resolveImportSource(source, fromFile, repoRoot) {
  if (!source || typeof source !== 'string') return null;
  if (!source.startsWith('.') && !source.startsWith('/')) return null; // external package or node: prefix
  const base = path.isAbsolute(fromFile) ? path.dirname(fromFile) : path.dirname(path.join(repoRoot, fromFile));
  let resolved;
  if (source.startsWith('/')) {
    resolved = path.join(repoRoot, source);
  } else {
    resolved = path.resolve(base, source);
  }
  const rel = path.relative(repoRoot, resolved).replace(/\\/g, '/');
  const candidates = [rel];
  if (!/\.[mc]?js$/.test(rel)) {
    candidates.push(`${rel}.js`, `${rel}.mjs`, `${rel}.cjs`, `${rel}/index.js`, `${rel}/index.mjs`, `${rel}/index.cjs`);
  }
  for (const c of candidates) {
    const abs = path.join(repoRoot, c);
    if (fs.existsSync(abs)) return { rel: c, abs };
  }
  return { rel, abs: null };
}

function extractTopLevelIdentifiers(text) {
  const ids = new Set();
  if (!text) return ids;
  const parts = String(text).split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    let m;
    if (trimmed.startsWith('{')) {
      // destructuring pattern — we cannot reliably extract binding names without a parser
      return null;
    }
    // take first identifier before =, {, [, :, etc.
    m = trimmed.match(/^[A-Za-z_$][\w$]*/);
    if (m && !JS_KEYWORDS.has(m[0])) ids.add(m[0]);
  }
  return ids;
}

function parseExportList(listText, source = null, repoRoot, seenFiles) {
  const names = new Set();
  if (!listText) return names;
  const specifiers = String(listText).split(',').map((s) => s.trim()).filter(Boolean);
  for (const spec of specifiers) {
    const parts = spec.split(/\s+as\s+/i).map((p) => p.trim());
    if (source) {
      // export { a, b as c } from './x'  => exported names are the aliases (right side) or same name
      const exportedName = parts.length > 1 ? parts[1] : parts[0];
      if (exportedName) names.add(exportedName);
    } else {
      // export { a, b as c } => exported names are the aliases (right side)
      const exportedName = parts.length > 1 ? parts[1] : parts[0];
      if (exportedName) names.add(exportedName);
    }
  }
  return names;
}

function parseExports(fileContent, filePath, repoRoot, seenFiles = new Set()) {
  const names = new Set();
  let indeterminate = false;

  if (!fileContent || typeof fileContent !== 'string') return { names, indeterminate };

  // 1. export function/class async function
  const declRe = /export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = declRe.exec(fileContent)) !== null) names.add(m[1]);

  // 2. export const/let/var — capture one or more identifiers
  const varRe = /export\s+(?:const|let|var)\s+([^{;]+?)(?:[;=]|$)/gm;
  while ((m = varRe.exec(fileContent)) !== null) {
    const extracted = extractTopLevelIdentifiers(m[1]);
    if (extracted === null) {
      indeterminate = true;
    } else {
      for (const id of extracted) names.add(id);
    }
  }

  // 3. export { ... } [from ...]
  const listRe = /export\s*\{\s*([^}]+)\s*\}(?:\s*from\s+['"`]([^'"`]+)['"`])?\s*;?/g;
  while ((m = listRe.exec(fileContent)) !== null) {
    const source = m[2];
    if (source) {
      const resolved = resolveImportSource(source, filePath, repoRoot);
      if (resolved?.abs) {
        if (seenFiles.has(resolved.abs)) continue; // cycle guard
        seenFiles.add(resolved.abs);
        const nested = parseExportsFromFile(resolved.abs, resolved.rel, repoRoot, seenFiles);
        for (const n of nested.names) names.add(n);
        if (nested.indeterminate) indeterminate = true;
      } else if (source.startsWith('.')) {
        indeterminate = true;
      }
    }
    const listNames = parseExportList(m[1], source, repoRoot, seenFiles);
    for (const n of listNames) names.add(n);
  }

  // 4. export * from './x' (does NOT re-export default)
  const starRe = /export\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s+)?from\s+['"`]([^'"`]+)['"`]/g;
  while ((m = starRe.exec(fileContent)) !== null) {
    const source = m[1];
    const resolved = resolveImportSource(source, filePath, repoRoot);
    if (resolved?.abs) {
      if (seenFiles.has(resolved.abs)) continue;
      seenFiles.add(resolved.abs);
      const nested = parseExportsFromFile(resolved.abs, resolved.rel, repoRoot, seenFiles);
      for (const n of nested.names) names.add(n);
      if (nested.indeterminate) indeterminate = true;
    } else if (source.startsWith('.')) {
      indeterminate = true;
    }
  }

  // 5. export default
  const defaultRe = /export\s+default\s+(?:class|function)?\s*([A-Za-z_$][\w$]*)?/g;
  while ((m = defaultRe.exec(fileContent)) !== null) {
    names.add('default');
  }

  return { names, indeterminate };
}

function parseExportsFromFile(absPath, relPath, repoRoot, seenFiles) {
  try {
    const content = fs.readFileSync(absPath, 'utf8');
    return parseExports(content, relPath, repoRoot, seenFiles);
  } catch {
    return { names: new Set(), indeterminate: true };
  }
}

function splitImportSpecifiers(specText) {
  const names = [];
  if (!specText) return names;
  const parts = specText.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([A-Za-z_$][\w$]*)\s+(?:as|AS)\s+([A-Za-z_$][\w$]*)$/);
    if (m) {
      names.push({ local: m[2], imported: m[1] });
    } else if (/^[A-Za-z_$][\w$]*$/.test(part)) {
      names.push({ local: part, imported: part });
    }
  }
  return names;
}

function parseImports(content, filePath, repoRoot) {
  const checks = [];
  if (!content) return checks;

  // named imports
  const namedRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s+['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = namedRe.exec(content)) !== null) {
    const source = m[2];
    const names = splitImportSpecifiers(m[1]);
    checks.push({ kind: 'named', source, names: names.map((n) => n.local), raw: m[0] });
  }

  // default imports
  const defaultRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((m = defaultRe.exec(content)) !== null) {
    checks.push({ kind: 'default', source: m[2], names: ['default'], raw: m[0] });
  }

  // namespace imports
  const nsRe = /import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((m = nsRe.exec(content)) !== null) {
    checks.push({ kind: 'namespace', source: m[2], names: [], raw: m[0] });
  }

  // dynamic imports — usage cannot be statically verified
  const dynamicRe = /import\s*\(\s*([^)]+)\s*\)/g;
  while ((m = dynamicRe.exec(content)) !== null) {
    const arg = m[1].trim();
    if (/^['"`]/.test(arg)) {
      // dynamic import of a literal string: still can't verify member access, but can verify the module exists later
      const source = arg.replace(/^['"`]|['"`]$/g, '');
      checks.push({ kind: 'dynamic', source, names: [], raw: m[0], literal: true });
    } else {
      checks.push({ kind: 'dynamic', source: null, names: [], raw: m[0], literal: false });
    }
  }

  return checks;
}

function checkImports(content, filePath, repoRoot, logger) {
  const checks = parseImports(content, filePath, repoRoot);
  const details = [];
  let overallStatus = 'PASS';
  const indeterminateReasons = [];

  for (const check of checks) {
    if (check.kind === 'namespace') {
      // namespace import: no named binding to verify
      details.push({ ...check, status: 'PASS', reason: 'namespace_import_not_checked_by_name' });
      continue;
    }

    if (check.kind === 'dynamic' && !check.literal) {
      details.push({ ...check, status: 'INDETERMINATE', reason: 'dynamic_import_non_literal' });
      indeterminateReasons.push('dynamic import with non-literal source');
      if (overallStatus === 'PASS') overallStatus = 'INDETERMINATE';
      continue;
    }

    const resolved = resolveImportSource(check.source, filePath, repoRoot);
    if (!resolved) {
      // external package or node: scheme — not statically verifiable
      details.push({ ...check, status: 'PASS', reason: 'external_or_builtin_package' });
      continue;
    }
    if (!resolved.abs) {
      details.push({ ...check, status: 'FAIL', reason: `import_source_missing: ${check.source}` });
      overallStatus = 'FAIL';
      continue;
    }

    const seen = new Set();
    const parsed = parseExportsFromFile(resolved.abs, resolved.rel, repoRoot, seen);
    const available = parsed.names;

    if (parsed.indeterminate) {
      details.push({ ...check, status: 'INDETERMINATE', reason: `source_export_shape_indeterminate: ${check.source}` });
      indeterminateReasons.push(`could not fully parse exports from ${check.source}`);
      if (overallStatus === 'PASS') overallStatus = 'INDETERMINATE';
      continue;
    }

    if (check.kind === 'dynamic' && check.literal) {
      // dynamic import resolves; usage not verifiable
      details.push({ ...check, status: 'INDETERMINATE', reason: `dynamic_import_literal_resolves: ${check.source}` });
      indeterminateReasons.push('dynamic import usage not statically verifiable');
      if (overallStatus === 'PASS') overallStatus = 'INDETERMINATE';
      continue;
    }

    const missing = [];
    for (const name of check.names) {
      if (!available.has(name)) missing.push(name);
    }
    if (missing.length) {
      details.push({ ...check, status: 'FAIL', reason: `missing_named_export: ${missing.join(', ')} from ${check.source}`, missing });
      overallStatus = 'FAIL';
    } else {
      details.push({ ...check, status: 'PASS', reason: 'named_exports_resolved' });
    }
  }

  const reason = overallStatus === 'FAIL'
    ? details.filter((d) => d.status === 'FAIL').map((d) => d.reason).join('; ')
    : (indeterminateReasons.length ? `indeterminate_imports: ${indeterminateReasons.join('; ')}` : null);
  return { status: overallStatus, reason, details };
}

function extractSqlStrings(content) {
  const strings = [];
  if (!content) return strings;

  // template literals (backticks) — may contain ${} interpolation
  const templateRe = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  let m;
  while ((m = templateRe.exec(content)) !== null) {
    strings.push({ text: m[1], raw: m[0], kind: 'template', dynamic: m[1].includes('${') });
  }

  // single-quoted strings
  const singleRe = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  while ((m = singleRe.exec(content)) !== null) {
    strings.push({ text: m[1], raw: m[0], kind: 'single', dynamic: false });
  }

  // double-quoted strings
  const doubleRe = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  while ((m = doubleRe.exec(content)) !== null) {
    strings.push({ text: m[1], raw: m[0], kind: 'double', dynamic: false });
  }

  return strings;
}

function extractSqlTables(sql) {
  const tables = [];
  const upper = sql.toUpperCase();
  if (!SQL_KEYWORDS.test(sql)) return tables;

  const patterns = [
    { re: /\bFROM\s+([A-Za-z_][\w.]*)/gi, type: 'from' },
    { re: /\bJOIN\s+([A-Za-z_][\w.]*)/gi, type: 'join' },
    { re: /\bINTO\s+([A-Za-z_][\w.]*)/gi, type: 'into' },
    { re: /\bUPDATE\s+([A-Za-z_][\w.]*)/gi, type: 'update' },
    { re: /\bDELETE\s+FROM\s+([A-Za-z_][\w.]*)/gi, type: 'delete' },
    { re: /\bINSERT\s+INTO\s+([A-Za-z_][\w.]*)/gi, type: 'insert' },
    { re: /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][\w.]*)/gi, type: 'create' },
    { re: /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([A-Za-z_][\w.]*)/gi, type: 'drop' },
    { re: /\bALTER\s+TABLE\s+([A-Za-z_][\w.]*)/gi, type: 'alter' },
  ];

  for (const { re } of patterns) {
    let m;
    while ((m = re.exec(sql)) !== null) {
      tables.push(m[1]);
    }
  }
  return tables;
}

function loadKnownTables(repoRoot) {
  const tables = new Set();
  const migrationDir = path.join(repoRoot, 'db', 'migrations');
  const files = [];
  try {
    if (fs.existsSync(migrationDir)) {
      for (const f of fs.readdirSync(migrationDir)) {
        if (f.endsWith('.sql')) files.push(path.join(migrationDir, f));
      }
    }
  } catch {
    // best effort
  }
  const schemaPath = path.join(repoRoot, 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) files.push(schemaPath);

  for (const file of files) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][\w.]*)/gi;
      let m;
      while ((m = createRe.exec(text)) !== null) tables.add(m[1]);
    } catch {
      // skip unreadable file
    }
  }

  return tables;
}

function isSystemTable(name) {
  if (!name) return false;
  const parts = String(name).split('.');
  if (parts.length > 1 && SYSTEM_SCHEMAS.has(parts[0].toLowerCase())) return true;
  return false;
}

function checkSql(content, knownTables) {
  const strings = extractSqlStrings(content);
  const details = [];
  const missingTables = new Set();
  const indeterminateReasons = [];
  let overallStatus = 'PASS';

  for (const str of strings) {
    if (!SQL_KEYWORDS.test(str.text)) {
      details.push({ text: str.text.slice(0, 80), status: 'PASS', reason: 'not_a_sql_string' });
      continue;
    }
    if (str.dynamic) {
      details.push({ text: str.text.slice(0, 80), status: 'INDETERMINATE', reason: 'sql_template_literal_with_interpolation' });
      indeterminateReasons.push('SQL template literal contains ${} interpolation');
      if (overallStatus === 'PASS') overallStatus = 'INDETERMINATE';
      continue;
    }
    const tables = extractSqlTables(str.text);
    if (!tables.length) {
      details.push({ text: str.text.slice(0, 80), status: 'INDETERMINATE', reason: 'sql_keywords_present_but_no_table_extracted' });
      indeterminateReasons.push('SQL string could not be parsed for table names');
      if (overallStatus === 'PASS') overallStatus = 'INDETERMINATE';
      continue;
    }
    const localMissing = [];
    for (const table of tables) {
      if (isSystemTable(table)) continue;
      if (!knownTables.has(table)) localMissing.push(table);
    }
    if (localMissing.length) {
      details.push({ text: str.text.slice(0, 120), status: 'FAIL', reason: `missing_sql_table: ${localMissing.join(', ')}`, tables: localMissing });
      for (const t of localMissing) missingTables.add(t);
      overallStatus = 'FAIL';
    } else {
      details.push({ text: str.text.slice(0, 120), status: 'PASS', reason: 'all_referenced_tables_known', tables });
    }
  }

  const reason = overallStatus === 'FAIL'
    ? `missing_sql_table: ${[...missingTables].join(', ')}`
    : (indeterminateReasons.length ? `indeterminate_sql: ${[...new Set(indeterminateReasons)].join('; ')}` : null);
  return { status: overallStatus, reason, details };
}

export function verifyGeneratedContentGrounding({
  filePath,
  content,
  repoRoot = process.cwd(),
  knownTables = null,
  rejectedHashes = [],
  logger = null,
} = {}) {
  try {
    const resolvedFilePath = filePath
      ? (path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath))
      : null;
    let text;
    if (content !== undefined && content !== null) {
      text = String(content);
    } else if (resolvedFilePath && fs.existsSync(resolvedFilePath)) {
      text = fs.readFileSync(resolvedFilePath, 'utf8');
    } else {
      return { status: 'INDETERMINATE', reason: 'missing_file_or_content', details: { filePath } };
    }

    if (text.length > MAX_CONTENT_LENGTH) {
      return { status: 'INDETERMINATE', reason: 'content_exceeds_max_static_check_length', details: { length: text.length } };
    }

    const hash = sha256(text);
    const rejected = Array.isArray(rejectedHashes) ? rejectedHashes : [];
    if (rejected.length && rejected.includes(hash)) {
      return { status: 'FAIL', reason: 'rejected_content_hash', details: { hash } };
    }

    const tables = knownTables ?? loadKnownTables(repoRoot);
    const importResult = checkImports(text, resolvedFilePath || 'inline', repoRoot, logger);
    const sqlResult = checkSql(text, tables);

    const details = {
      filePath: resolvedFilePath || 'inline',
      hash,
      importChecks: importResult.details,
      sqlChecks: sqlResult.details,
    };

    if (importResult.status === 'FAIL' || sqlResult.status === 'FAIL') {
      const reasons = [importResult.reason, sqlResult.reason].filter(Boolean);
      return { status: 'FAIL', reason: reasons.join('; '), details };
    }

    if (importResult.status === 'INDETERMINATE' || sqlResult.status === 'INDETERMINATE') {
      const reasons = [importResult.reason, sqlResult.reason].filter(Boolean);
      return { status: 'INDETERMINATE', reason: reasons.join('; '), details };
    }

    return { status: 'PASS', reason: null, details };
  } catch (err) {
    return { status: 'INDETERMINATE', reason: `grounding_check_exception: ${err.message}`, details: { error: err.message } };
  }
}

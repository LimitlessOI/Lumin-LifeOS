/**
 * SYNOPSIS: Real integration context for the autonomous /build call — live DB
 * schema digest + injected-deps contract + auto-mount convention, so generated
 * modules COMPOSE with the running system instead of importing things that do
 * not exist. This is the fix for the observed false-done class where the loop
 * emitted individually-plausible files that could never run together (imported a
 * non-existent `./ai-council.js`, called service exports that were never defined,
 * assumed tables/columns that were not in the schema, and were never mounted).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * The exact deps object auto-registered product modules receive at
 * register(app, deps) — kept in sync with what the founder-runtime boot passes
 * in startup/register-founder-runtime-routes.js. Generated code MUST use these
 * instead of importing its own AI client / DB client / commit helper.
 */
export const INJECTED_DEPS_CONTRACT = [
  ['pool', 'node-postgres Pool — query the live DB with `await pool.query(sql, params)`. Do NOT create your own pg client / connection.'],
  ['requireKey', 'Express middleware enforcing the command key — put it on protected routes: `app.post(path, deps.requireKey, handler)`.'],
  ['callCouncilMember', 'async (role, prompt, opts?) => string — the ONLY AI hook. Do NOT import `./ai-council.js` or any other AI SDK; that module does not exist.'],
  ['logger', 'structured logger (`logger.info/warn/error`).'],
  ['baseUrl', 'public base URL string of the running deploy.'],
  ['commitToGitHub', 'async (path, content, message) => commit a single file to the repo.'],
  ['commitManyToGitHub', 'async (files[], message) => commit multiple files to the repo.'],
];

/**
 * Parse CREATE TABLE statements out of the repo's SQL migrations into a compact
 * { table -> [columns] } map. Network-free + deterministic so it is unit-testable
 * and adds no latency/side-effects to a build. Best-effort: ignores constraint
 * lines and anything it cannot parse rather than throwing.
 */
export function parseSchemaFromMigrations(migrationsDir) {
  const schema = {};
  let files;
  try {
    files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return schema;
  }
  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?([a-z0-9_.]+)["`]?\s*\(/i;
  for (const file of files) {
    let sql;
    try {
      sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    } catch {
      continue;
    }
    let idx = 0;
    while (idx < sql.length) {
      const m = createRe.exec(sql.slice(idx));
      if (!m) break;
      const table = m[1].replace(/^public\./, '');
      const openParen = idx + m.index + m[0].length - 1;
      // Walk to the matching close paren for this CREATE TABLE body.
      let depth = 0;
      let end = openParen;
      for (let i = openParen; i < sql.length; i += 1) {
        if (sql[i] === '(') depth += 1;
        else if (sql[i] === ')') { depth -= 1; if (depth === 0) { end = i; break; } }
      }
      const body = sql.slice(openParen + 1, end);
      const cols = extractColumns(body);
      if (!schema[table]) schema[table] = [];
      for (const c of cols) if (!schema[table].includes(c)) schema[table].push(c);
      idx = end + 1;
    }
  }
  return schema;
}

const CONSTRAINT_KEYWORDS = new Set([
  'primary', 'foreign', 'unique', 'constraint', 'check', 'exclude', 'like', 'index',
]);

function extractColumns(body) {
  const cols = [];
  // Split on top-level commas only (ignore commas inside parens, e.g. numeric(10,2)).
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  for (const raw of parts) {
    const line = raw.trim();
    if (!line) continue;
    const first = line.split(/\s+/)[0].replace(/["`]/g, '').toLowerCase();
    if (CONSTRAINT_KEYWORDS.has(first)) continue;
    if (!/^[a-z_][a-z0-9_]*$/.test(first)) continue;
    cols.push(first);
  }
  return cols;
}

/**
 * Pick the schema tables most relevant to a build step so the injected context
 * stays compact (token-cheap). A table is relevant if its name shares a token
 * with the target file / product id / task; falls back to nothing rather than
 * dumping all ~hundreds of tables. Always bounded by `limit`.
 */
export function selectRelevantTables(schema, { targetFile = '', productId = '', task = '', limit = 12 } = {}) {
  const hay = `${targetFile} ${productId} ${task}`.toLowerCase();
  const tokens = Array.from(new Set(hay.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)));
  const names = Object.keys(schema);
  const scored = names.map((name) => {
    const nameTokens = name.split('_');
    let score = 0;
    for (const t of tokens) {
      if (name.includes(t)) score += 2;
      for (const nt of nameTokens) if (nt && (t.includes(nt) || nt.includes(t))) score += 1;
    }
    return { name, score };
  });
  const relevant = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return relevant.map((s) => s.name);
}

/**
 * Build the human-readable integration context block appended to the /build task.
 * `moduleStep` (default true) includes the auto-mount convention (for route/UI
 * modules that must go LIVE); pass false for non-module targets (migrations).
 */
export function buildIntegrationContext({
  root,
  targetFile = '',
  productId = '',
  task = '',
  moduleStep = true,
  tableLimit = 12,
} = {}) {
  const migrationsDir = path.join(root, 'db', 'migrations');
  const schema = parseSchemaFromMigrations(migrationsDir);
  const tables = selectRelevantTables(schema, { targetFile, productId, task, limit: tableLimit });

  const lines = [];
  lines.push('INTEGRATION CONTEXT (this code runs inside the live LifeOS founder-runtime — it MUST compose with it, not stand alone):');

  if (moduleStep && /^routes\/.+\.(js|mjs)$/.test(targetFile)) {
    const base = path.basename(targetFile).replace(/\.(js|mjs)$/, '');
    const fnName = 'register' + base.split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join('');
    lines.push('');
    lines.push('MOUNTING (do NOT edit server.js or any startup/boot file — it is a protected composition root):');
    lines.push(`- Export a register function: \`export function ${fnName}(app, deps) { /* app.get/post(...); */ }\` (a default export also works).`);
    lines.push(`- Add this module to config/auto-registered-product-modules.json so the boot auto-mounts it: \`{ "path": "${targetFile}", "register": "${fnName}", "enabled": true }\`.`);
    lines.push('- The boot module-health gate verifies the module actually imports + mounts LIVE; a broken import or missing registration will fail the step (not a false done).');
  }

  lines.push('');
  lines.push('INJECTED DEPENDENCIES — use these from the `deps` argument; do NOT import your own AI/DB/commit clients:');
  for (const [name, desc] of INJECTED_DEPS_CONTRACT) lines.push(`- deps.${name}: ${desc}`);

  lines.push('');
  if (tables.length) {
    lines.push('LIVE DB SCHEMA (use these EXACT table + column names via deps.pool; do NOT invent tables or columns):');
    for (const t of tables) lines.push(`- ${t}(${schema[t].join(', ')})`);
  } else {
    lines.push('LIVE DB SCHEMA: no existing table matched this step. If you need persistence, add a migration at db/migrations/<date>_<name>.sql (applied on boot) rather than assuming a table exists.');
  }

  lines.push('');
  lines.push('RULES: import only modules that exist in this repo; never import a sibling service export you have not confirmed exists. Prefer deps over new imports. Unreachable/broken code will fail the functional-proof gate.');

  return { context: lines.join('\n'), tables, schemaTableCount: Object.keys(schema).length };
}

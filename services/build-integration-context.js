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
 * Read the installed npm dependency names from package.json (prod + dev). The
 * builder must import ONLY these packages (plus node builtins + repo-relative
 * files that exist) — importing an uninstalled package makes the module fail to
 * load, which the functional-proof gate then rejects (a false-done otherwise).
 */
export function readInstalledPackages(root) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return Array.from(new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ])).sort();
  } catch {
    return [];
  }
}

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
  expectedExports = [],
  fileContains = [],
  route = null,
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
    const ssotHome = productId ? `docs/products/${productId}/PRODUCT_HOME.md` : 'docs/products/<product>/PRODUCT_HOME.md';
    lines.push('- ROUTE FILE RULES: The file MUST start with exactly this JSDoc block (no other comment or text before it):');
    lines.push(`\`\`\`js`);
    lines.push(`/**`);
    lines.push(` * SYNOPSIS: <one-line description>`);
    lines.push(` * @ssot ${ssotHome}`);
    lines.push(` */`);
    lines.push(`\`\`\``);
    if (route && route.method && route.path) {
      lines.push(`- REQUIRED ROUTE: mount ${route.method.toUpperCase()} \`${route.path}\` inside the register function. Use the exact method and path.`);
      lines.push('- Use the exact pattern below. Replace `<serviceFunction>` with the actual sibling service export you confirmed exists (check SERVICE-SPECIFIC FILE RULES if the matching service step is already done), and replace `<payload>`/`<param>` with the real keys from the request and LIVE DB SCHEMA:');
      lines.push(`\`\`\`js`);
      lines.push(`/**`);
      lines.push(` * SYNOPSIS: One-line description of the route.`);
      lines.push(` * @ssot ${ssotHome}`);
      lines.push(` */`);
      lines.push(`import { <serviceFunction> } from '../services/<serviceFile>.js';`);
      lines.push(`export function ${fnName}(app, deps) {`);
      lines.push(`  app.${route.method.toLowerCase()}('${route.path}', deps.requireKey, async (req, res, next) => {`);
      lines.push(`    try {`);
      if (route.method.toLowerCase() === 'get') {
        lines.push(`      const { id } = req.params;`);
        lines.push(`      const result = await <serviceFunction>(deps, { id });`);
      } else {
        lines.push(`      const payload = req.body;`);
        lines.push(`      const result = await <serviceFunction>(deps, payload);`);
      }
      lines.push(`      res.json(result);`);
      lines.push(`    } catch (error) {`);
      lines.push(`      deps.logger.error({ error }, 'Error in ${base} route');`);
      lines.push(`      next(error);`);
      lines.push(`    }`);
      lines.push(`  });`);
      lines.push(`}`);
      lines.push(`\`\`\``);
    }
    lines.push('- ROUTE-SPECIFIC FILE RULES: Do NOT use `express.Router()` or `app.use()` for a single route. Do NOT import `Request`, `Response`, or `NextFunction` from `express` (those are TypeScript types, not JS values). Do NOT import `requireKey`, `logger`, or `callCouncilMember` from sibling files; they come from `deps`. You MAY import an existing sibling service function you have confirmed exists (e.g. `import { verifyCredential } from \'../services/credentialVerification.js\';`).');
  } else if (moduleStep && /^scripts\/.+\.(js|mjs)$/i.test(targetFile)) {
    const base = path.basename(targetFile).replace(/\.(js|mjs)$/, '');
    const ssotHome = productId ? `docs/products/${productId}/PRODUCT_HOME.md` : 'docs/products/<product>/PRODUCT_HOME.md';
    lines.push('');
    lines.push('SCRIPT-SPECIFIC FILE RULES (this is a standalone analysis/utility script, not a route or service):');
    lines.push(`- The file MUST start with exactly this JSDoc block (no other comment or text before it):`);
    lines.push(`\`\`\`js`);
    lines.push(`/**`);
    lines.push(` * SYNOPSIS: <one-line description>`);
    lines.push(` * @ssot ${ssotHome}`);
    lines.push(` */`);
    lines.push(`\`\`\``);
    if (expectedExports.length) {
      lines.push(`- Export these named async functions: ${expectedExports.map((n) => `\`${n}\``).join(', ')}. They should be pure-analysis functions taking an options object and returning a structured comparison/result.`);
      const ex = expectedExports[0];
      lines.push('- Use the exact pattern below. Replace the function name(s) and analysis logic with the real subject of the script; do NOT import an AI SDK, DB client, or logger from a repo path:');
      lines.push(`\`\`\`js`);
      lines.push(`/**`);
      lines.push(` * SYNOPSIS: One-line description.`);
      lines.push(` * @ssot ${ssotHome}`);
      lines.push(` */`);
      lines.push(`export async function ${ex}(options = {}) {`);
      lines.push(`  // Pure analysis / scoping logic. No DB, no AI client, no side effects.`);
      lines.push(`  return {`);
      lines.push(`    approach: '...',`);
      lines.push(`    pros: ['...'],`);
      lines.push(`    cons: ['...'],`);
      lines.push(`    recommendation: '...',`);
      lines.push(`  };`);
      lines.push(`}`);
      lines.push(`\`\`\``);
    }
    lines.push('- SCRIPT RULES: Do NOT import `pg`, `openai`, `dotenv`, or sibling files. Do NOT call `process.exit()`. Do NOT include a shebang. Do NOT include `if (import.meta.main)` or CLI argument parsing. The script is imported by tests/builder, so it must be pure ES module functions.');
  } else if (moduleStep && /^services\/.+\.js$/i.test(targetFile)) {
    const base = path.basename(targetFile).replace(/\.js$/, '');
    const fnName = expectedExports[0] || base;
    lines.push('');
    lines.push('SERVICE-SPECIFIC FILE RULES (do NOT make this a route or CLI script — it is imported by routes as a service function):');
    lines.push(`- The file MUST start with exactly this JSDoc block (no other comment or text before it):`);
    lines.push(`\`\`\`js`);
    lines.push(`/**`);
    lines.push(` * SYNOPSIS: <one-line description>`);
    lines.push(` * @ssot ${productId ? `docs/products/${productId}/PRODUCT_HOME.md` : 'docs/products/<product>/PRODUCT_HOME.md'}`);
    lines.push(` */`);
    lines.push(`\`\`\``);
    lines.push(`- Export a named function like \`export async function ${fnName}(deps, payload) { ... }\`. deps has \`pool\` and \`logger\`.`);
    lines.push('- Use the exact pattern below. Replace the SQL and column names with values from LIVE DB SCHEMA, and replace the function name if the required export differs:');
    lines.push(`\`\`\`js`);
    lines.push(`/**`);
    lines.push(` * SYNOPSIS: <one-line description>`);
    lines.push(` * @ssot ${productId ? `docs/products/${productId}/PRODUCT_HOME.md` : 'docs/products/<product>/PRODUCT_HOME.md'}`);
    lines.push(` */`);
    lines.push(`export async function ${fnName}(deps, payload) {`);
    lines.push(`  const { pool, logger } = deps;`);
    lines.push(`  const { id } = payload || {};`);
    lines.push(`  try {`);
    lines.push(`    const { rows } = await pool.query('SELECT * FROM <table_name> WHERE id = $1', [id]);`);
    lines.push(`    return rows[0] || null;`);
    lines.push(`  } catch (error) {`);
    lines.push(`    logger.error({ error }, 'Error in ${fnName}');`);
    lines.push(`    throw new Error('Failed in ${fnName}');`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(`\`\`\``);
    lines.push('- SERVICE RULES: Do NOT create `new Pool()`. Do NOT import `pg`. Do NOT import a logger from a repo path. Do NOT import sibling files you have not confirmed exist. Do NOT include example usage or `if (require.main === module)` guards.');
  }

  lines.push('');
  lines.push('INJECTED DEPENDENCIES — use these from the `deps` argument; do NOT import your own AI/DB/commit clients:');
  for (const [name, desc] of INJECTED_DEPS_CONTRACT) lines.push(`- deps.${name}: ${desc}`);

  lines.push('');
  if (tables.length) {
    lines.push('LIVE DB SCHEMA (use these EXACT table + column names via deps.pool; do NOT invent tables or columns):');
    for (const t of tables) lines.push(`- ${t}(${schema[t].join(', ')})`);
    lines.push('- id / created_at / updated_at columns are DB-DEFAULTED (gen_random_uuid() / NOW()) — do NOT generate UUIDs or timestamps in JS and do NOT import a uuid package; INSERT without them and let the DB fill them (use RETURNING to read them back).');
  } else {
    lines.push('LIVE DB SCHEMA: no existing table matched this step. If you need persistence, add a migration at db/migrations/<date>_<name>.sql (applied on boot) rather than assuming a table exists.');
  }

  const packages = readInstalledPackages(root);
  lines.push('');
  if (packages.length) {
    lines.push(`AVAILABLE NPM PACKAGES — import ONLY from this list (plus node: builtins and repo-relative files that already exist). Importing anything else fails at load time (module not found) and the functional-proof gate will reject the step: ${packages.join(', ')}.`);
  }

  lines.push('');
  lines.push('RULES: import only packages in the AVAILABLE list above and repo files you have confirmed exist; never import a sibling service export you have not confirmed exists. Prefer deps over new imports. Unreachable/broken code will fail the functional-proof gate.');

  if (/\.(js|mjs|cjs)$/i.test(targetFile)) {
    lines.push('');
    lines.push('FILE RULES — violating any of these blocks commit (the pre-commit gate will reject the file):');
    const ssotHome = productId ? `docs/products/${productId}/PRODUCT_HOME.md` : 'docs/products/<product>/PRODUCT_HOME.md';
    lines.push(`- The FIRST comment in the file must be a JSDoc block containing \`@ssot ${ssotHome}\` (this is the canonical product home for ${productId || 'this product'}). No markdown fence, no plain comment, no "// services/..." line before it.`);
    lines.push('- Output plain ES module JavaScript (ESM) only. NO TypeScript type annotations, NO type imports, NO \`: Type\` syntax, and NO \`const x: Type\`. The file extension is .js and it runs directly with Node 20.');
    lines.push('- Use ONLY the injected deps object. Do NOT \`import pg\` or \`new Pool()\`. Do NOT import a logger from any repo path. Do NOT import sibling files you have not confirmed exist. Database access is \`await deps.pool.query(sql, params)\`; logging is \`deps.logger.info/warn/error\`.');
    if (expectedExports.length) {
      lines.push(`- You MUST export exactly these named exports: ${expectedExports.map((n) => `\`${n}\``).join(', ')}. Do not rename them.`);
    }
    if (fileContains.length) {
      lines.push(`- The source code must contain these literal substrings (they will be checked after commit): ${fileContains.map((s) => JSON.stringify(s)).join(', ')}.`);
    }
    lines.push('- Do not include example usage, test code, or \`if (require.main === module)\` guards at the bottom of the file.');
  }

  return { context: lines.join('\n'), tables, packages, schemaTableCount: Object.keys(schema).length };
}

/**
 * SYNOPSIS: BuilderOS Phase R2 — groq_llama anti-pattern scanner.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * BuilderOS Phase R2 — groq_llama anti-pattern scanner.
 *
 * READ-ONLY. Scans a JS file for the 9 confirmed groq_llama failure patterns.
 * Used to validate builder output before accepting committed:true as clean.
 *
 * GAP-FILL: builder (groq_llama) produced 7-bug output — invalid regex escapes
 * (\pq), unescaped / terminating regex literal (../startup), wrong stub detector,
 * duplicate function declaration. Rewritten with line.includes() instead of
 * complex regex for reliability.
 *
 * Phase A (2026-05-27): Added PATTERN 9 (import-merge detection) and
 * PATTERN 8 json-fence fix. Builder (groq) rewrote entire file with wrong
 * patterns and syntax errors — GAP-FILL repair applied.
 *
 * Exit 0 = no HIGH findings. Exit 1 = HIGH findings detected.
 */

import { readFileSync } from 'fs';

export function scanForGroqAntipatterns(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    return { ok: false, filePath, lineCount: 0, findings: [{ pattern: 'READ_ERROR', line: e.message, lineNum: 0, severity: 'HIGH' }] };
  }

  const lines = content.split('\n');
  const findings = [];

  // PATTERN 1: factory param named rk instead of requireKey
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if ((l.includes('function create') || l.includes('export function create')) &&
        (l.includes('{ rk,') || l.includes('{ rk }') || l.includes(', rk,') || l.includes(', rk }'))) {
      findings.push({ pattern: 'RK_NOT_REQUIREKEY', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 2: pool.query(text`...`) — template-tagged literal (text is not a function)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('pool.query(text`') || l.includes('.query(text`')) {
      findings.push({ pattern: 'TEXT_TEMPLATE_TAG', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 3: COUNT() without * — invalid SQL
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('COUNT()') && !l.trim().startsWith('//')) {
      findings.push({ pattern: 'COUNT_NO_STAR', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'MEDIUM' });
    }
  }

  // PATTERN 4: wrong import paths — nonexistent files
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes("'../startup/db.js'") || l.includes("'../startup/auth.js'") ||
        l.includes('"../startup/db.js"') || l.includes('"../startup/auth.js"')) {
      findings.push({ pattern: 'WRONG_IMPORT_PATH', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 5: const rows = await pool.query — QueryResult not destructured
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if ((l.includes('const rows = await') || l.includes('const result = await')) &&
        l.includes('pool.query') && !l.trim().startsWith('//')) {
      findings.push({ pattern: 'QUERY_NOT_DESTRUCTURED', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'MEDIUM' });
    }
  }

  // PATTERN 6: module-level router (outside factory) — duplicate mount bug
  const hasFactory = content.includes('export function create');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('const router = express.Router()') && !hasFactory) {
      findings.push({ pattern: 'MODULE_LEVEL_ROUTER', line: l.trim().slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 7: absolute floor — near-empty output is always truncation; short utilities (5-30 lines) are legitimate
  if (lines.length < 5 && lines.length > 0) {
    findings.push({ pattern: 'STUB_LINE_COUNT', line: `${lines.length} lines`, lineNum: 0, severity: 'HIGH' });
  }

  // PATTERN 8: markdown fences embedded in JS (builder sometimes injects ```)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '```' || l === '```javascript' || l === '```js' || l === '```json') {
      findings.push({ pattern: 'MARKDOWN_FENCE_IN_JS', line: l, lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 9: import-merge bug (groq concatenates consecutive import lines)
  // e.g. "import { X } from 'path'\nimport { Y } from 'url'" → "pathimport 'path'; urlimport 'url'"
  // Match identifier+import glued together anywhere on the line, not just at column 0.
  const importMergeRe = /(^|[^a-zA-Z0-9_$])([a-zA-Z_$][a-zA-Z0-9_$]*import)(?=[\s{(;'"])/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (importMergeRe.test(l)) {
      findings.push({ pattern: 'IMPORT_MERGE_BUG', line: l.slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 10: CommonJS bleed in ESM targets.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (l.includes('module.exports') || l.includes('exports.') || l.includes('require(')) {
      findings.push({ pattern: 'COMMONJS_BLEED', line: l.slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 11: partial-edit corruption markers and "unchanged remainder" placeholders.
  const partialEditMarkers = [
    'rest of file unchanged',
    'existing code unchanged',
    '... unchanged',
    'other code remains unchanged',
    'same as above',
  ];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase();
    if (partialEditMarkers.some((marker) => l.includes(marker))) {
      findings.push({ pattern: 'PARTIAL_EDIT_CORRUPTION', line: lines[i].trim().slice(0, 100), lineNum: i + 1, severity: 'MEDIUM' });
    }
  }

  // PATTERN 12: asyncFn hallucination — Gemini Flash writes `asyncFn` instead of `async function`.
  // This is not valid JS and fails node --check. Catch it here for a useful error message.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (/\basyncFn\b/.test(l)) {
      findings.push({ pattern: 'ASYNC_FN_HALLUCINATION', line: l.slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 13: verify scripts that double-read fetch response body
  if (/verify-.*\.mjs$/i.test(filePath) && content.includes('.json().catch') && content.includes('response.text()')) {
    findings.push({
      pattern: 'VERIFY_DOUBLE_BODY_READ',
      line: 'response.json().catch(() => response.text())',
      lineNum: 0,
      severity: 'HIGH',
    });
  }

  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  return { ok: highCount === 0, filePath, lineCount: lines.length, findings };
}

if (process.argv[2]) {
  const result = scanForGroqAntipatterns(process.argv[2]);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

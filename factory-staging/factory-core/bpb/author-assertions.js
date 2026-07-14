/**
 * SYNOPSIS: STEP 5b — BPB authors behavior_assertions from the BLUEPRINT SPEC at
 * intake (Chair ruling, live council SHA 1783452556804: option (a)). This is the
 * assertion-authorship half of the governed shipping runner: the governed pipe
 * needs blueprint-authored assertions per server-code step, and by the STEP 4
 * assertion-provenance lock those must NOT come from codegen.
 *
 * This module is the ONLY sanctioned author of assertions for autonomously-shipped
 * steps. It is PURE and NON-FABRICATING: it translates expectations the blueprint
 * ALREADY DECLARED (expected_exports / route+expect_status / db table) into the
 * concrete SENTRY assertion schema. It never invents a success criterion the spec
 * did not state — a server-code step whose spec declares nothing verifiable
 * returns { ok:false } so the STEP-4 provenance gate fails it closed rather than
 * letting codegen ship unprovable code.
 *
 * Provenance stamped 'bpb' (a blueprint-derived authority), never 'codegen', so
 * SENTRY still validates independently-authored assertions against model output.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const SERVER_CODE_DIR_RE = /^(routes|services|middleware|startup)\/|^factory-staging\/factory-core\//;

export function isServerCodeTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  return SERVER_CODE_DIR_RE.test(t) && /\.(mjs|cjs|js|ts)$/.test(t);
}

/**
 * Author behavior_assertions for a step from its blueprint-declared spec.
 * Returns { ok, assertions, provenance, reason }. Fail-closed: a server-code
 * target with no declared, verifiable expectation yields ok:false (never a
 * fabricated assertion).
 *
 * Recognised declarations on step.assertion_spec (or step.spec.assertions):
 *   - expected_exports: string[]  -> file_contains per export (proves symbol authored)
 *   - route: { path, method?, expect_status? } -> module_mounts / http_status
 *   - db: { sql, params?, expect_min_rows? }    -> db_row_exists (read-only SELECT)
 *   - file_contains: string[]                   -> file_contains verbatim substrings
 */
function collectTopLevelExpectation(step) {
  const out = {};
  if (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0) {
    const names = step.expected_exports.filter((n) => typeof n === 'string' && n.trim());
    if (names.length) out.expected_exports = names;
  }
  if (Array.isArray(step?.file_contains) && step.file_contains.length > 0) {
    const arr = step.file_contains.filter((s) => typeof s === 'string' && s.trim());
    if (arr.length) out.file_contains = arr;
  }
  if (step?.route && typeof step.route === 'object' && typeof step.route.path === 'string' && step.route.path.trim()) {
    out.route = step.route;
  } else if (typeof step?.route === 'string' && step.route.trim()) {
    const withMethod = step.route.trim().match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)$/i);
    if (withMethod) out.route = { method: withMethod[1].toUpperCase(), path: withMethod[2] };
    else if (step.route.trim().startsWith('/') && !/\s/.test(step.route.trim())) out.route = { path: step.route.trim() };
  }
  return out;
}

export function authorAssertionsFromSpec(step) {
  const target = String(step?.target_file || '');
  // Prefer explicit assertion_spec; also accept BUILD_QUEUE top-level expected_exports/route/file_contains
  // (same shape toGovernedShipStep normalises) so raw ship-queue posts are not falsely unprovable.
  const nested = (step?.spec && typeof step.spec === 'object' ? step.spec.assertions : null) || {};
  const top = collectTopLevelExpectation(step);
  const declared = (step?.assertion_spec && typeof step.assertion_spec === 'object') ? step.assertion_spec : {};
  const spec = { ...nested, ...top, ...declared };
  const assertions = [];

  const exports = Array.isArray(spec.expected_exports) ? spec.expected_exports : [];
  const exportNames = exports.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim());
  if (exportNames.length) {
    // Prefer exports_smoke (importable / declared export) over bare substring match —
    // file_contains alone let broken modules pass when the name appeared in a comment.
    assertions.push({ type: 'exports_smoke', target, exports: exportNames });
    for (const name of exportNames) {
      assertions.push({ type: 'file_contains', target, substring: name });
    }
  }

  const substrings = Array.isArray(spec.file_contains) ? spec.file_contains : [];
  for (const s of substrings) {
    if (typeof s === 'string' && s.trim()) {
      assertions.push({ type: 'file_contains', target, substring: s });
    }
  }

  if (spec.route && typeof spec.route.path === 'string' && spec.route.path.trim()) {
    const expect_status = Array.isArray(spec.route.expect_status) ? spec.route.expect_status : undefined;
    assertions.push({
      type: expect_status ? 'http_status' : 'module_mounts',
      target,
      method: spec.route.method || 'GET',
      path: spec.route.path,
      ...(expect_status ? { expect_status } : {}),
      ...(spec.route.headers ? { headers: spec.route.headers } : {}),
    });
  }

  if (spec.db && typeof spec.db.sql === 'string' && spec.db.sql.trim()) {
    assertions.push({
      type: 'db_row_exists',
      sql: spec.db.sql,
      params: Array.isArray(spec.db.params) ? spec.db.params : [],
      ...(Number.isFinite(spec.db.expect_min_rows) ? { expect_min_rows: spec.db.expect_min_rows } : {}),
    });
  }

  if (assertions.length === 0) {
    // Fail-closed ONLY where SENTRY would require proof. A non-server-code target
    // (e.g. a doc/asset) that declares nothing verifiable is legitimately proof-free.
    if (isServerCodeTarget(target)) {
      return { ok: false, assertions: [], provenance: 'bpb', reason: 'spec_declares_no_verifiable_behavior' };
    }
    return { ok: true, assertions: [], provenance: 'bpb', reason: 'no_proof_required_non_server_code' };
  }

  return { ok: true, assertions, provenance: 'bpb' };
}

/**
 * Attach BPB-authored assertions to a step, ready for /factory/execute-step.
 * Returns { ok, step, reason }. Never overwrites assertions the blueprint already
 * declared directly (those are already provenance-clean); only fills the gap.
 */
export function attachAuthoredAssertions(step) {
  if (Array.isArray(step?.behavior_assertions) && step.behavior_assertions.length > 0) {
    return { ok: true, step, provenance: 'blueprint_declared' };
  }
  const authored = authorAssertionsFromSpec(step);
  if (!authored.ok) return { ok: false, step, reason: authored.reason };
  return {
    ok: true,
    step: { ...step, behavior_assertions: authored.assertions },
    provenance: authored.provenance,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CommonJS -> ESM normaliser for server-code blueprints
//
// The repo is `type: "module"`, but cheap tiers sometimes ignore the prompt and
// emit `const X = require('...'); ... module.exports = { ... }`. This is a
// deterministic, lossless conversion applied at intake (toGovernedShipStep) and
// after generation (runAuthoring) so SENTRY sees real ESM exports and the file
// survives `node --check` in the actual module system.
//
// It is intentionally conservative: it only touches files that contain `require`
// or `module.exports`, leaves `.cjs` files alone, and gives up on the rare
// pathological expression it cannot parse cleanly.
// ──────────────────────────────────────────────────────────────────────────────

const CJS_RE = /\b(module\.exports|exports)\b|\brequire\s*\(/;

function isIdentifierStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentifierChar(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function isIdentifier(str) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(str || '').trim());
}

function skipWhitespace(text, i) {
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

function readIdentifier(text, i) {
  if (!isIdentifierStart(text[i])) return { name: '', end: i };
  let j = i;
  while (j < text.length && isIdentifierChar(text[j])) j += 1;
  return { name: text.slice(i, j), end: j };
}

function stripKeyQuotes(key) {
  return String(key || '').replace(/^['"`]|['"`]$/g, '').trim();
}

function safeKey(key) {
  const k = stripKeyQuotes(key);
  return isIdentifier(k) ? k : k.replace(/[^A-Za-z0-9_$]/g, '_');
}

// Walk text from [start, end) and call fn(i, ch) for every character that is not
// inside a string, template literal, or comment. If fn returns false, stop and
// return the index at which it stopped.
function forEachCodeChar(text, start, end, fn) {
  let inString = false;
  let stringQuote = '';
  let escaped = false;
  let inSingleComment = false;
  let inBlockComment = false;
  let i = start;
  while (i < end) {
    const ch = text[i];
    const next = text[i + 1] || '';

    if (inSingleComment) {
      if (ch === '\n') inSingleComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      inSingleComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringQuote = ch;
      i += 1;
      continue;
    }

    if (fn(i, ch) === false) return i;
    i += 1;
  }
  return -1;
}

function isCodeIndex(text, idx) {
  // true if text[idx] is a code character (not inside a string or comment)
  return forEachCodeChar(text, 0, idx + 1, (i) => i !== idx) === idx;
}

function findMatchingBrace(text, openIndex) {
  if (text[openIndex] !== '{') return -1;
  let depth = 1;
  let result = -1;
  forEachCodeChar(text, openIndex + 1, text.length, (i, ch) => {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    if (depth === 0) {
      result = i;
      return false;
    }
    return true;
  });
  return result;
}

function findTopLevelSemicolon(text, start) {
  let depth = 0;
  let result = text.length;
  forEachCodeChar(text, start, text.length, (i, ch) => {
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ';' && depth === 0) {
      result = i;
      return false;
    }
    return true;
  });
  return result;
}

function splitTopLevelCommas(text, start, end) {
  let depth = 0;
  let last = start;
  const parts = [];
  forEachCodeChar(text, start, end, (i, ch) => {
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(text.slice(last, i));
      last = i + 1;
    }
    return true;
  });
  parts.push(text.slice(last, end));
  return parts;
}

function splitTopLevelColon(text, start, end) {
  let depth = 0;
  let result = -1;
  forEachCodeChar(text, start, end, (i, ch) => {
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ':' && depth === 0) {
      result = i;
      return false;
    }
    return true;
  });
  return result;
}

function parseObjectLiteral(inner) {
  const props = [];
  for (const part of splitTopLevelCommas(inner, 0, inner.length)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = splitTopLevelColon(trimmed, 0, trimmed.length);
    if (colon === -1) {
      const key = stripKeyQuotes(trimmed);
      if (isIdentifier(key)) {
        props.push({ key, value: key, shorthand: true });
      }
    } else {
      const key = stripKeyQuotes(trimmed.slice(0, colon));
      const value = trimmed.slice(colon + 1).trim();
      props.push({ key: safeKey(key), value, shorthand: false });
    }
  }
  return props;
}

function propertyExport(key, value, shorthand) {
  if (shorthand && isIdentifier(key)) return `export { ${key} };`;
  if (isIdentifier(key) && isIdentifier(value) && key === value) return `export { ${key} };`;
  const k = safeKey(key);
  return `export const ${k} = ${value};`;
}

function exportExpressionValue(value) {
  const valueTrim = value.trim();
  const fnMatch = valueTrim.match(/^(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (fnMatch) {
    return `export ${fnMatch[1] || ''}function ${fnMatch[2]}${valueTrim.slice(fnMatch[0].length)}`;
  }
  const clsMatch = valueTrim.match(/^class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (clsMatch) {
    return `export class ${clsMatch[1]}${valueTrim.slice(clsMatch[0].length)}`;
  }
  if (isIdentifier(valueTrim)) return `export { ${valueTrim} };`;
  return `export default ${valueTrim};`;
}

function replaceRequire(code) {
  return code.replace(
    /(?:^|(?<=[;{}]))(\s*)(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*|\{[^}]*\})\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)(?:\.([A-Za-z_$][A-Za-z0-9_$]*))?\s*;?/gm,
    (match, leading, kind, binding, mod, prop) => {
      if (binding.trim().startsWith('{')) {
        const inner = binding.slice(1, -1).trim();
        const names = inner
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            const [orig, alias] = p.split(':').map((s) => s.trim());
            if (alias && isIdentifier(orig) && isIdentifier(alias)) return `${orig} as ${alias}`;
            return orig;
          });
        return `${leading}import { ${names.join(', ')} } from '${mod}';`;
      }
      if (prop) {
        return `${leading}import { ${prop} as ${binding.trim()} } from '${mod}';`;
      }
      return `${leading}import ${binding.trim()} from '${mod}';`;
    },
  );
}

function findNextModuleExports(code, i) {
  let idx = code.indexOf('module.exports', i);
  while (idx !== -1) {
    if (isCodeIndex(code, idx)) return idx;
    idx = code.indexOf('module.exports', idx + 1);
  }
  return -1;
}

function parseModuleExportsStatement(code, idx) {
  const prefix = 'module.exports';
  let pos = idx + prefix.length;
  pos = skipWhitespace(code, pos);

  if (code[pos] === '.') {
    pos += 1;
    const { name: prop, end: idEnd } = readIdentifier(code, pos);
    if (!prop) return { replacement: '', end: idx + prefix.length };
    pos = idEnd;
    pos = skipWhitespace(code, pos);
    if (code[pos] !== '=') return { replacement: '', end: idx + prefix.length };
    pos += 1;
    pos = skipWhitespace(code, pos);
    const valueStart = pos;
    const semi = findTopLevelSemicolon(code, valueStart);
    const value = code.slice(valueStart, semi).trim();
    const stmtEnd = semi === code.length ? code.length : semi + 1;
    return { replacement: `export const ${prop} = ${value};`, end: stmtEnd };
  }

  if (code[pos] === '=') {
    pos += 1;
    pos = skipWhitespace(code, pos);
    const valueStart = pos;

    if (code[valueStart] === '{') {
      const close = findMatchingBrace(code, valueStart);
      if (close === -1) return { replacement: '', end: idx + prefix.length };
      const inner = code.slice(valueStart + 1, close);
      const props = parseObjectLiteral(inner);
      const lines = props.map((p) => propertyExport(p.key, p.value, p.shorthand));
      const semi = findTopLevelSemicolon(code, close + 1);
      const stmtEnd = semi === code.length ? code.length : semi + 1;
      return { replacement: lines.join('\n'), end: stmtEnd };
    }

    const semi = findTopLevelSemicolon(code, valueStart);
    const value = code.slice(valueStart, semi).trim();
    const stmtEnd = semi === code.length ? code.length : semi + 1;
    return { replacement: exportExpressionValue(value), end: stmtEnd };
  }

  return { replacement: '', end: idx + prefix.length };
}

function replaceModuleExports(code) {
  let result = '';
  let i = 0;
  while (true) {
    const idx = findNextModuleExports(code, i);
    if (idx === -1) {
      result += code.slice(i);
      break;
    }
    result += code.slice(i, idx);
    const parsed = parseModuleExportsStatement(code, idx);
    result += parsed.replacement;
    i = parsed.end;
  }
  return result;
}

export function normalizeCommonJsToEsm(code, targetFile = '') {
  if (!code || typeof code !== 'string') return code;
  const t = String(targetFile || '').replace(/\\/g, '/');
  if (t.toLowerCase().endsWith('.cjs')) return code;
  if (!CJS_RE.test(code)) return code;
  let out = replaceRequire(code);
  out = replaceModuleExports(out);
  return out;
}

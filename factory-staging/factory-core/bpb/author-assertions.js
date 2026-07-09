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

function isServerCodeTarget(target) {
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

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
export function authorAssertionsFromSpec(step) {
  const target = String(step?.target_file || '');
  const spec = step?.assertion_spec || (step?.spec && typeof step.spec === 'object' ? step.spec.assertions : null) || {};
  const assertions = [];

  const exports = Array.isArray(spec.expected_exports) ? spec.expected_exports : [];
  for (const name of exports) {
    if (typeof name === 'string' && name.trim()) {
      assertions.push({ type: 'file_contains', target, substring: name.trim() });
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

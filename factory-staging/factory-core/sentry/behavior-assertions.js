/**
 * SYNOPSIS: SENTRY behavioral proof. Classifies which steps require runtime
 * behavior_assertions and executes them (db_row_exists / http_status /
 * module_mounts / file_contains) through an injected runner, returning verbatim
 * per-assertion results. Fail-closed: a step that requires proof but declares no
 * assertions, has no runner, or fails any assertion is a SENTRY FAIL. factory-core
 * stays pure — the runner (pg pool + fetch + fs) is injected at the route boundary.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

// Server-code targets are executable modules whose "success" can lie about
// runtime effect (e.g. a handler that returns ok without writing the DB).
const SERVER_CODE_DIR_RE = /^(routes|services|middleware|startup)\/|^factory-staging\/factory-core\//;

export function stepRequiresBehaviorProof(step) {
  if (!step) return false;
  if (step.declares_behavioral_effect === true) return true;
  if (Array.isArray(step.behavior_assertions) && step.behavior_assertions.length > 0) return true;
  const target = String(step.target_file || '').replace(/\\/g, '/');
  if (!SERVER_CODE_DIR_RE.test(target)) return false;
  return /\.(mjs|cjs|js|ts)$/.test(target);
}

function isReadOnlySelect(sql) {
  const s = String(sql || '').trim().toLowerCase();
  if (!s.startsWith('select') && !s.startsWith('with')) return false;
  // no statement chaining
  if (/;\s*\S/.test(s)) return false;
  return !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|call)\b/.test(s);
}

export async function runSingleAssertion(assertion, runner = {}) {
  const base = { assertion, checked_at: new Date().toISOString() };
  try {
    switch (assertion?.type) {
      case 'db_row_exists': {
        if (typeof runner.db !== 'function') return { ...base, ok: false, reason: 'no_db_runner' };
        if (!isReadOnlySelect(assertion.sql)) return { ...base, ok: false, reason: 'sql_must_be_read_only_select' };
        const rows = await runner.db(assertion.sql, assertion.params || []);
        const observed = Array.isArray(rows) ? rows.length : 0;
        const min = Number.isFinite(assertion.expect_min_rows) ? assertion.expect_min_rows : 1;
        return {
          ...base,
          ok: observed >= min,
          observed_rows: observed,
          expected_min_rows: min,
          rows_sample: (Array.isArray(rows) ? rows : []).slice(0, 3),
        };
      }
      case 'http_status': {
        if (typeof runner.http !== 'function') return { ...base, ok: false, reason: 'no_http_runner' };
        const res = await runner.http({ method: assertion.method || 'GET', path: assertion.path, headers: assertion.headers });
        const expect = Array.isArray(assertion.expect_status) ? assertion.expect_status : [200];
        return { ...base, ok: expect.includes(res.status), observed_status: res.status, expected_status: expect };
      }
      case 'module_mounts': {
        if (typeof runner.http !== 'function') return { ...base, ok: false, reason: 'no_http_runner' };
        const expect = Array.isArray(assertion.expect_status) ? assertion.expect_status : [200, 401, 403];
        let res = await runner.http({ method: assertion.method || 'GET', path: assertion.path, headers: assertion.headers });
        // A 404 can mean a new route module has been shipped but not yet mounted at
        // runtime. If the assertion carries the target module and the runner can
        // reload it, mount the module and re-prove before failing.
        if (res.status === 404 && typeof runner.reload === 'function' && assertion.target) {
          try {
            await runner.reload(assertion.target);
          } catch (err) {
            return { ...base, ok: false, reason: 'reload_failed', observed_status: 404, error: String(err?.message || err) };
          }
          res = await runner.http({ method: assertion.method || 'GET', path: assertion.path, headers: assertion.headers });
        }
        // "mounted" = anything but 404 (auth-gated 401/403 still proves the route exists)
        return { ...base, ok: res.status !== 404 && expect.includes(res.status), observed_status: res.status, expected_status: expect };
      }
      case 'file_contains': {
        if (typeof runner.readFile !== 'function') return { ...base, ok: false, reason: 'no_file_runner' };
        const content = await runner.readFile(assertion.target || assertion.path);
        return { ...base, ok: typeof content === 'string' && content.includes(assertion.substring), substring: assertion.substring };
      }
      case 'exports_smoke': {
        // Stronger than file_contains: prove the module imports and named exports exist.
        if (typeof runner.importModule === 'function') {
          const mod = await runner.importModule(assertion.target || assertion.path);
          const names = Array.isArray(assertion.exports) ? assertion.exports : (assertion.export ? [assertion.export] : []);
          const missing = names.filter((n) => !(mod && Object.prototype.hasOwnProperty.call(mod, n)));
          return {
            ...base,
            ok: missing.length === 0,
            exports: names,
            missing,
            reason: missing.length ? `missing_exports:${missing.join(',')}` : undefined,
          };
        }
        if (typeof runner.readFile !== 'function') return { ...base, ok: false, reason: 'no_import_or_file_runner' };
        const content = await runner.readFile(assertion.target || assertion.path);
        if (typeof content !== 'string') return { ...base, ok: false, reason: 'file_unreadable' };
        const names = Array.isArray(assertion.exports) ? assertion.exports : (assertion.export ? [assertion.export] : []);
        const missing = names.filter((n) => {
          const re = new RegExp(`(?:export\\s+(?:async\\s+)?function\\s+${n}\\b|export\\s+(?:const|let|var|class)\\s+${n}\\b|export\\s*\\{[^}]*\\b${n}\\b)`);
          return !re.test(content);
        });
        return {
          ...base,
          ok: missing.length === 0,
          exports: names,
          missing,
          reason: missing.length ? `export_declaration_missing:${missing.join(',')}` : undefined,
          mode: 'static_export_scan',
        };
      }
      default:
        return { ...base, ok: false, reason: `unknown_assertion_type:${assertion?.type}` };
    }
  } catch (err) {
    return { ...base, ok: false, reason: 'assertion_threw', error: String(err?.message || err) };
  }
}

export async function runBehaviorAssertions(assertions = [], runner = {}) {
  const results = [];
  for (const assertion of assertions) results.push(await runSingleAssertion(assertion, runner));
  return results;
}

/**
 * Pure gate decision from a precomputed behavior context.
 * @param {object} step
 * @param {{ runnerAvailable?: boolean, results?: object[] }} ctx
 */
export function evaluateBehaviorGate(step, ctx = {}) {
  const runnerAvailable = Boolean(ctx.runnerAvailable);
  const results = Array.isArray(ctx.results) ? ctx.results : [];
  const required = stepRequiresBehaviorProof(step);
  const declared = Array.isArray(step?.behavior_assertions) ? step.behavior_assertions : [];
  const findings = [];

  if (required) {
    if (declared.length === 0) findings.push('missing_behavior_proof');
    else if (!runnerAvailable) findings.push('behavior_runner_unavailable');
    else if (results.some((r) => !r.ok)) findings.push('behavior_assertion_failed');
  }

  return {
    pass: findings.length === 0,
    required,
    declared_count: declared.length,
    runner_available: runnerAvailable,
    findings,
    results,
  };
}

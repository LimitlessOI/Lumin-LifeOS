/**
 * SYNOPSIS: STEP 5d — BPB derives an `assertion_spec` from an EXISTING mission
 * BLUEPRINT.json step, so legacy contracts become provable by the governed pipe
 * WITHOUT reauthoring every mission (Chair ruling, live council receipt
 * LIFERE_COUNCIL_1783453514819: "add a BPB intake layer that reads each mission's
 * BLUEPRINT.json to generate the needed assertion_spec automatically, with
 * mission-authored overrides only where required").
 *
 * NON-FABRICATING — this is the crux of the Chair's #1 risk ("silent coverage
 * gaps: steps that look valid but still can't be proven"). It derives assertions
 * ONLY from evidence the blueprint actually carries:
 *   - a mission-authored override (step.assertion_spec / behavior_assertions)     -> declared
 *   - a write_file_exact contract's exact_content (symbols we will literally write)-> derived_exact
 *   - a copied source file's content (byte-for-byte)                              -> derived_source
 * A `builder_build` step that declares only a title/target with NO verifiable
 * expectation is reported as coverage:'gap' — NEVER given an invented assertion.
 * The audit surfaces gaps so Century/SENTRY can act BEFORE any fence flip.
 *
 * Pure: any source-file content is read at the boundary and passed in.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const SERVER_CODE_DIR_RE = /^(routes|services|middleware|startup)\/|^factory-staging\/factory-core\//;

function isServerCodeTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  return SERVER_CODE_DIR_RE.test(t) && /\.(mjs|cjs|js|ts)$/.test(t);
}

// A write_file_exact step carries its bytes via exact_inputs (the real schema:
// { exact_inputs: { content_source_path | exact_content }, exact_output_contract
// : { sha256 } }) or, in older shapes, a top-level exact_content/content_source_path.
export function getExactContent(step) {
  if (typeof step?.exact_content === 'string') return step.exact_content;
  if (typeof step?.exact_inputs?.exact_content === 'string') return step.exact_inputs.exact_content;
  return null;
}
export function getContentSourcePath(step) {
  return step?.exact_inputs?.content_source_path || step?.content_source_path || null;
}

// Extract top-level exported symbol names from JS/TS source. Conservative: only
// forms that unambiguously introduce a named export.
export function extractExportedSymbols(source) {
  const text = String(source || '');
  const names = new Set();
  const namedDecl = /\bexport\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = namedDecl.exec(text))) names.add(m[1]);
  const braceList = /\bexport\s*\{([^}]*)\}/g;
  while ((m = braceList.exec(text))) {
    for (const part of m[1].split(',')) {
      const as = part.trim().split(/\s+as\s+/i);
      const exported = (as[1] || as[0] || '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(exported)) names.add(exported);
    }
  }
  return [...names];
}

/**
 * Derive an assertion_spec for one blueprint step.
 * @param {object} step   a BLUEPRINT.json step
 * @param {object} [ctx]  { sourceContent } — content of step.content_source_path,
 *                        read at the boundary (module stays pure)
 * @returns {{ assertion_spec: object|null, coverage: string, derived_from: string, reason?: string }}
 *   coverage: 'declared' | 'derived_exact' | 'derived_source' | 'not_required' | 'gap'
 */
export function deriveAssertionSpecFromBlueprintStep(step, ctx = {}) {
  const target = String(step?.target_file || '');

  // 1) mission-authored override wins (already provenance-clean).
  if (step?.assertion_spec && typeof step.assertion_spec === 'object' && Object.keys(step.assertion_spec).length > 0) {
    return { assertion_spec: step.assertion_spec, coverage: 'declared', derived_from: 'mission_override_assertion_spec' };
  }
  if (Array.isArray(step?.behavior_assertions) && step.behavior_assertions.length > 0) {
    return { assertion_spec: null, coverage: 'declared', derived_from: 'mission_override_behavior_assertions' };
  }

  // 2) write_file_exact with inline exact_content — we KNOW the exact bytes, so
  //    exported symbols parsed from it are genuinely provable (file_contains).
  const exact = getExactContent(step);
  if (exact) {
    const exports = extractExportedSymbols(exact);
    if (exports.length > 0) {
      return { assertion_spec: { expected_exports: exports }, coverage: 'derived_exact', derived_from: 'exact_content_exports' };
    }
    // exact content with no exports but a distinctive first non-empty line is still provable
    const line = exact.split('\n').map((l) => l.trim()).find((l) => l.length >= 12 && !l.startsWith('//') && !l.startsWith('*'));
    if (line) {
      return { assertion_spec: { file_contains: [line.slice(0, 80)] }, coverage: 'derived_exact', derived_from: 'exact_content_signature_line' };
    }
  }

  // 3) content_source_path (via exact_inputs) — byte-for-byte copy of a CONTENT
  //    snapshot; parse the SOURCE we will copy. The exact_output_contract.sha256
  //    already pins the bytes, so exported symbols from the source are provable.
  if (getContentSourcePath(step) && typeof ctx.sourceContent === 'string' && ctx.sourceContent.trim()) {
    const exports = extractExportedSymbols(ctx.sourceContent);
    if (exports.length > 0) {
      return { assertion_spec: { expected_exports: exports }, coverage: 'derived_source', derived_from: 'content_source_path_exports' };
    }
    const line = ctx.sourceContent.split('\n').map((l) => l.trim()).find((l) => l.length >= 12 && !l.startsWith('//') && !l.startsWith('*'));
    if (line) {
      return { assertion_spec: { file_contains: [line.slice(0, 80)] }, coverage: 'derived_source', derived_from: 'content_source_path_signature_line' };
    }
  }

  // 4) nothing provable declared.
  if (!isServerCodeTarget(target)) {
    return { assertion_spec: {}, coverage: 'not_required', derived_from: 'non_server_code_target' };
  }
  return {
    assertion_spec: null,
    coverage: 'gap',
    derived_from: 'none',
    reason: `server-code step '${step?.step_id || '?'}' (${step?.action_type || 'unknown'}) declares no verifiable expectation and carries no exact_content/source to derive from`,
  };
}

/**
 * Audit a whole blueprint's steps for governed-pipe provability.
 * @returns {{ mission_id, total, provable, gaps, by_coverage, gap_steps }}
 */
export function auditBlueprintCoverage(blueprint, resolveSource = () => null) {
  const steps = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  const by_coverage = {};
  const gap_steps = [];
  for (const step of steps) {
    let sourceContent = null;
    const srcPath = getContentSourcePath(step);
    if (srcPath) {
      try { sourceContent = resolveSource(srcPath); } catch { sourceContent = null; }
    }
    const d = deriveAssertionSpecFromBlueprintStep(step, { sourceContent });
    by_coverage[d.coverage] = (by_coverage[d.coverage] || 0) + 1;
    if (d.coverage === 'gap') {
      const gap_kind = srcPath && !sourceContent
        ? 'source_missing'
        : (step?.action_type === 'write_file_exact' ? 'exact_no_symbols' : 'no_declaration');
      gap_steps.push({ step_id: step?.step_id, target_file: step?.target_file, action_type: step?.action_type, gap_kind, reason: d.reason });
    }
  }
  const provable = (by_coverage.declared || 0) + (by_coverage.derived_exact || 0) + (by_coverage.derived_source || 0) + (by_coverage.not_required || 0);
  return {
    mission_id: blueprint?.mission_id || blueprint?.blueprint_id || null,
    total: steps.length,
    provable,
    gaps: by_coverage.gap || 0,
    by_coverage,
    gap_steps,
  };
}

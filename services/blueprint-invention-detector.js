/**
 * SYNOPSIS: Deterministic no-invention detector for generated blueprints (M1).
 *
 * The founder's law is "the queue is not allowed to make up anything — just
 * slices of the blueprint." Before this file, that law existed only as prose in
 * per-mission DO_NOT_INVENT.json files handed to a model as a string, which
 * enforces nothing: the Overlay intake fabricated complete SQL schemas for seven
 * stores whose columns the source document never specified, invented a competing
 * SSOT path from the document title while `product_name: "universal-overlay"` was
 * passed explicitly, and still came back `ready_to_execute: true`.
 *
 * Every check here is a pure function of two artifacts the detector does not
 * write. No model judgment is in the verdict path, so the answer cannot be
 * negotiated, and the detector cannot manufacture its own evidence.
 *
 * A defect is not a crash. Each one carries the authority that must resolve it,
 * so the caller can route rather than guess — missing specification is a
 * blueprint defect, not a Builder decision.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

export const DEFECT_AUTHORITY = {
  INVENTED_SQL_SCHEMA: 'architect',
  INVENTED_TABLE: 'architect',
  SSOT_IDENTITY_MISMATCH: 'deterministic_repair',
  STALE_RATIFIED_TERMINOLOGY: 'deterministic_repair',
  OVERLOADED_READY_FLAG: 'conductor',
  MISSING_PRODUCT_SENTRY_AUTH: 'conductor',
};

function readJson(rel, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

/** Columns the intent actually specified for a table, normalized to names. */
function intentColumnNames(table) {
  const cols = table?.columns;
  if (!Array.isArray(cols)) return [];
  return cols
    .map((c) => (typeof c === 'string' ? c.trim().split(/\s+/)[0] : c?.name))
    .filter(Boolean)
    .map((n) => String(n).toLowerCase());
}

/** Columns a generated contract asserts, whether given as DDL strings or objects. */
function contractColumnNames(table) {
  const cols = table?.columns;
  if (!Array.isArray(cols)) return [];
  return cols
    .map((c) => (typeof c === 'string' ? c.trim().split(/\s+/)[0] : c?.name))
    .filter(Boolean)
    .map((n) => String(n).toLowerCase());
}

/**
 * CHECK 1 — schema invention.
 * A generated contract may only assert columns the intent specified. An intent
 * table with `columns: []` means "unspecified", which is a blueprint defect to
 * route upward — NOT a blank cheque for the generator to design the schema.
 */
export function detectSchemaInvention({ intent, blueprint }) {
  const defects = [];
  const intentTables = new Map();
  for (const t of intent?.db_tables_needed || []) {
    if (t?.name) intentTables.set(String(t.name).toLowerCase(), t);
  }

  for (const step of blueprint?.steps || []) {
    for (const table of step?.contract?.tables || []) {
      const name = table?.name;
      if (!name) continue;
      const key = String(name).toLowerCase();
      const generated = contractColumnNames(table);
      if (generated.length === 0) continue;

      if (!intentTables.has(key)) {
        defects.push({
          id: 'INVENTED_TABLE',
          authority: DEFECT_AUTHORITY.INVENTED_TABLE,
          step_id: step.id || null,
          table: name,
          detail: `blueprint defines table "${name}" with ${generated.length} column(s); the extracted intent never names this table`,
          resolution_required: 'name the table and its columns in the authoritative blueprint, or remove the step',
        });
        continue;
      }

      const specified = intentColumnNames(intentTables.get(key));
      if (specified.length === 0) {
        defects.push({
          id: 'INVENTED_SQL_SCHEMA',
          authority: DEFECT_AUTHORITY.INVENTED_SQL_SCHEMA,
          step_id: step.id || null,
          table: name,
          invented_columns: generated,
          detail: `intent specifies table "${name}" with NO columns (unspecified); blueprint invented ${generated.length}: ${generated.join(', ')}`,
          resolution_required: `add explicit column specifications for "${name}" to the authoritative blueprint before manufacturing`,
        });
        continue;
      }

      const extra = generated.filter((c) => !specified.includes(c));
      if (extra.length > 0) {
        defects.push({
          id: 'INVENTED_SQL_SCHEMA',
          authority: DEFECT_AUTHORITY.INVENTED_SQL_SCHEMA,
          step_id: step.id || null,
          table: name,
          invented_columns: extra,
          detail: `blueprint adds ${extra.length} column(s) to "${name}" that the intent never specified: ${extra.join(', ')}`,
          resolution_required: `specify or remove: ${extra.join(', ')}`,
        });
      }
    }
  }
  return defects;
}

/**
 * CHECK 2 — identity substitution.
 * The authoritative product identity is the one that was passed in, never one
 * derived from a document title. A derived identity creates a second, competing
 * product home instead of extending the real one.
 */
export function detectIdentityMismatch({ productName, blueprint, registryPath = 'docs/products/PRODUCT_REGISTRY.json' }) {
  const defects = [];
  if (!productName) return defects;
  const meta = blueprint?._meta || {};
  const canonical = String(productName).trim();

  const registry = readJson(registryPath);
  const known = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'id' || k === 'slug' || k === 'product' || k === 'name') {
          if (typeof v === 'string') known.add(v.toLowerCase());
        }
        collect(v);
      }
    }
  };
  if (registry) collect(registry);

  const metaProduct = meta.product ? String(meta.product) : null;
  if (metaProduct && metaProduct.toLowerCase() !== canonical.toLowerCase()) {
    defects.push({
      id: 'SSOT_IDENTITY_MISMATCH',
      authority: DEFECT_AUTHORITY.SSOT_IDENTITY_MISMATCH,
      field: '_meta.product',
      expected: canonical,
      found: metaProduct,
      registered_product: known.has(canonical.toLowerCase()),
      detail: `authoritative product identity is "${canonical}" but the blueprint asserts "${metaProduct}" — a derived identity would create a competing product home`,
      resolution_required: `rewrite _meta.product to "${canonical}" (mechanical: the authoritative value was supplied, not inferred)`,
    });
  }

  for (const field of ['ssot_tag', 'parent_ssot']) {
    const value = meta[field];
    if (typeof value !== 'string' || !value) continue;
    const pointsAtCanonical = value.toLowerCase().includes(`/${canonical.toLowerCase()}/`);
    if (!pointsAtCanonical) {
      defects.push({
        id: 'SSOT_IDENTITY_MISMATCH',
        authority: DEFECT_AUTHORITY.SSOT_IDENTITY_MISMATCH,
        field: `_meta.${field}`,
        expected: `docs/products/${canonical}/PRODUCT_HOME.md`,
        found: value,
        detail: `SSOT path does not resolve under the authoritative product "${canonical}"${/\s/.test(value) ? ' (and contains spaces, which is not a valid product-home path)' : ''}`,
        resolution_required: `bind _meta.${field} to the registered product home for "${canonical}"`,
      });
    }
  }
  return defects;
}

/**
 * CHECK 3 — manufacturing against superseded terminology.
 * Reads the machine-readable bridge; a rename never depends on a model
 * understanding prose. Only founder-facing prose scopes are checked — live code
 * identifiers are a separate governed migration.
 */
export function detectStaleTerminology({ intent, bridgePath = 'builderos-reboot/governance/TERMINOLOGY_BRIDGE.json' }) {
  const defects = [];
  const bridge = readJson(bridgePath);
  if (!bridge) return defects;

  for (const term of bridge.terms || []) {
    if (term.migration_state !== 'ratified_target') continue;
    for (const scope of term.prose_scopes || []) {
      const raw = intent?.[scope];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const value of values) {
        if (typeof value !== 'string') continue;
        for (const former of term.former || []) {
          const flags = term.match_mode === 'word_boundary_case_sensitive_for_acronyms' ? 'g' : 'gi';
          const re = new RegExp(`\\b${former.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
          if (!re.test(value)) continue;
          defects.push({
            id: 'STALE_RATIFIED_TERMINOLOGY',
            authority: DEFECT_AUTHORITY.STALE_RATIFIED_TERMINOLOGY,
            scope,
            former_term: former,
            canonical_term: term.canonical,
            effective_from: term.effective_from,
            excerpt: value.slice(0, 180),
            detail: `"${former}" was superseded by "${term.canonical}" on ${term.effective_from}; manufacturing against it would build the wrong name into acceptance criteria`,
            resolution_required: `replace "${former}" with "${term.canonical}" in ${scope}, then revalidate`,
          });
        }
      }
    }
  }
  return defects;
}

/**
 * CHECK 4 — an overloaded readiness flag.
 * `ready_to_execute` from a structural checker means "the graph is well-formed",
 * not "intent is satisfied" and not "this may execute". Treating one as the
 * other is how the Overlay reached `ready` with an invented schema inside it.
 */
export function detectOverloadedReadyFlag({ arcReport }) {
  const defects = [];
  if (!arcReport || arcReport.ready_to_execute !== true) return defects;

  const method = arcReport.method || arcReport.check_type || arcReport.verdict_basis || null;
  const structuralOnly = !method || /deterministic|structural/i.test(String(method));
  const hasIntentValidation = Boolean(
    arcReport.architect_intent_validated || arcReport.intent_coverage_map || arcReport.intent_validated_by
  );
  const hasExecutionAuthorization = Boolean(arcReport.execution_authorized || arcReport.authorization_receipt);

  if (structuralOnly && !hasIntentValidation) {
    defects.push({
      id: 'OVERLOADED_READY_FLAG',
      authority: DEFECT_AUTHORITY.OVERLOADED_READY_FLAG,
      field: 'arc_report.ready_to_execute',
      found: true,
      basis: method || 'deterministic_structural_check',
      missing: [
        !hasIntentValidation ? 'ARCHITECT_INTENT_VALIDATED' : null,
        !hasExecutionAuthorization ? 'EXECUTION_AUTHORIZED' : null,
      ].filter(Boolean),
      detail: 'ready_to_execute=true is carrying authority it never earned: it proves graph validity only — no intent validation and no positive execution authorization exist',
      resolution_required: 'split the flag into typed gate statuses; execution requires a current EXECUTION_AUTHORIZED, not the absence of a structural failure',
    });
  }
  return defects;
}

/**
 * CHECK 5 — no product-completion authority exists for this product.
 * SO-002 requires a real Sentry product gate. A product absent from the registry
 * has no gate at all, so nothing can ever declare it done.
 */
function detectMissingSentryAuthority({
  productName,
  registryPath = 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json',
}) {
  const defects = [];
  if (!productName) return defects;
  const registry = readJson(registryPath);
  if (!registry) return defects;
  const text = JSON.stringify(registry).toLowerCase();
  if (text.includes(String(productName).toLowerCase())) return defects;

  defects.push({
    id: 'MISSING_PRODUCT_SENTRY_AUTH',
    authority: DEFECT_AUTHORITY.MISSING_PRODUCT_SENTRY_AUTH,
    product: productName,
    registry: registryPath,
    detail: `"${productName}" is not registered for an SO-002 product-completion gate, so no authority can certify it complete — "endpoint 200" would be the only evidence available`,
    resolution_required: `register "${productName}" in ${registryPath} with its Layer A/B gates before manufacturing`,
  });
  return defects;
}

/**
 * Run every check over one intake session. `session` is read, never written.
 * Returns a fail-closed verdict plus the complete defect set — the whole set,
 * because a review that stops at the first defect forces N round trips through
 * the offices for one blueprint.
 */
export function detectInventions(session = {}) {
  const s = session.session || session;
  const intent = s.extracted_intent_json || {};
  const blueprint = s.blueprint_json || {};
  const arcReport = s.arc_report_json || null;
  const productName = s.product_name || null;

  const defects = [
    ...detectSchemaInvention({ intent, blueprint }),
    ...detectIdentityMismatch({ productName, blueprint }),
    ...detectStaleTerminology({ intent }),
    ...detectOverloadedReadyFlag({ arcReport }),
    ...detectMissingSentryAuthority({ productName }),
  ];

  const byId = {};
  for (const d of defects) byId[d.id] = (byId[d.id] || 0) + 1;
  const byAuthority = {};
  for (const d of defects) byAuthority[d.authority] = (byAuthority[d.authority] || 0) + 1;

  return {
    schema: 'blueprint_invention_report_v1',
    session_id: s.id || null,
    product_name: productName,
    verdict: defects.length === 0 ? 'NO_INVENTION_DETECTED' : 'BLUEPRINT_DEFECTS_PRESENT',
    manufacturing_authorized: defects.length === 0,
    defect_count: defects.length,
    by_id: byId,
    routing: byAuthority,
    defects,
  };
}

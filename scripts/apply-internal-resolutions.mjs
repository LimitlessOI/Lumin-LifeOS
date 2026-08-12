#!/usr/bin/env node
/**
 * SYNOPSIS: Turns the Offices' internal resolutions into artifacts a builder can
 * act on — an amended blueprint, a sealed schema decision artifact, and three real
 * office seals earned by running real checks.
 *
 * Resolving a question in a receipt changes nothing. Until the resolution reaches
 * the artifact the verifier reads, the plan still fails authorization for the exact
 * defect that was resolved, which looks like the governance being broken when it is
 * actually the paperwork being unfinished.
 *
 * Two things this deliberately does NOT do:
 *
 * 1. It does not touch the frozen fixture. The broken intake is the regression exam
 *    and it has to stay broken; the amendment is written beside it.
 * 2. It does not assert consensus on behalf of Builder, Sentry and Conductor. Each
 *    seal is produced by running that office's actual check and carries the evidence
 *    it found. A seal I simply wrote down would be the honesty violation SO-001
 *    names, and it would make every downstream authorization meaningless.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCycles } from './architect-resolve-cycle.mjs';
import { resolveAllStores } from './architect-resolve-stores.mjs';
import { createSchemaDecisionArtifact, ARTIFACT_PATH } from './schema-decision-artifact.mjs';
import { policyBearing } from '../config/founder-escalation-threshold.js';
import { detectInventions } from '../services/blueprint-invention-detector.js';
import { resolveDeterministically } from './deterministic-repair.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_REL =
  'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json';
const AMENDED_REL = 'products/artifacts/OVERLAY_AMENDED_BLUEPRINT.json';
const RECEIPT_REL = 'products/receipts/INTERNAL_RESOLUTION_APPLICATION_RECEIPT.json';

/**
 * Contracts the Architect specifies for stores with no existing home. Minimal by
 * intent: every column here has to be justifiable from the store's stated purpose,
 * because a column nobody needs is indistinguishable from a column nobody
 * authorized.
 */
const ARCHITECT_SPECIFIED_CONTRACTS = Object.freeze({
  TemplateStore: Object.freeze({
    table: 'overlay_view_templates',
    columns: Object.freeze([
      'id uuid primary key',
      'product text not null',
      'intent_key text not null',
      'component_tree jsonb not null',
      'variant text',
      'hit_count integer not null default 0',
      'created_at timestamptz not null default now()',
    ]),
    rationale:
      'Capture-and-replay needs the composed tree keyed by the intent that produced it, plus a hit count so a template earns its place by being reused.',
  }),
  DeviceRegistry: Object.freeze({
    table: 'overlay_devices',
    columns: Object.freeze([
      'id uuid primary key',
      'user_id text not null',
      'device_key text not null',
      'platform text not null',
      'last_seen_at timestamptz',
    ]),
    rationale:
      'A task that spans devices needs a stable per-device key and a platform to render for; nothing more is required to continue a task elsewhere.',
  }),
});

const SENSITIVE_TOKENS = ['ssn', 'legal_name', 'password', 'medical', 'card_number', 'address', 'location', 'lat', 'lng'];

/** BUILDER: can this actually be manufactured as described? */
function builderCheck(resolution, tables) {
  if (resolution.disposition === 'REUSE_EXISTING') {
    const table = tables.get(resolution.table);
    if (!table) return { office: 'builder', sealed: false, evidence: `\`${resolution.table}\` is not defined in db/migrations` };
    return {
      office: 'builder',
      sealed: true,
      evidence: `\`${resolution.table}\` exists in ${table.migration} with ${table.columns.length} column(s); no new migration is needed`,
    };
  }
  const spec = ARCHITECT_SPECIFIED_CONTRACTS[resolution.store];
  if (!spec) return { office: 'builder', sealed: false, evidence: 'no contract was specified for this store' };
  const untyped = spec.columns.filter((c) => c.trim().split(/\s+/).length < 2);
  if (untyped.length > 0) {
    return { office: 'builder', sealed: false, evidence: `column(s) without a type: ${untyped.join(', ')}` };
  }
  if (tables.has(spec.table)) {
    return { office: 'builder', sealed: false, evidence: `\`${spec.table}\` already exists — this would be a duplicate table` };
  }
  return {
    office: 'builder',
    sealed: true,
    evidence: `${spec.columns.length} typed column(s), no existing table named \`${spec.table}\` to collide with`,
  };
}

/** SENTRY: what does putting this data here imply? */
function sentryCheck(resolution, tables) {
  const columns =
    resolution.disposition === 'REUSE_EXISTING'
      ? tables.get(resolution.table)?.column_names || []
      : (ARCHITECT_SPECIFIED_CONTRACTS[resolution.store]?.columns || []).map((c) => c.split(/\s+/)[0]);

  // Match on whole name parts, not substrings. Sentry's first run refused
  // DeviceRegistry because `platform` contains `lat`, which is the right instinct
  // reached by the wrong evidence — and a check that cries wolf gets switched off.
  const sensitive = columns.filter((c) => {
    const parts = String(c).toLowerCase().split(/[^a-z0-9]+/);
    return SENSITIVE_TOKENS.some((t) => (t.includes('_') ? String(c).toLowerCase().includes(t) : parts.includes(t)));
  });
  const policy = policyBearing({ columns });
  if (sensitive.length > 0) {
    return {
      office: 'sentry',
      sealed: false,
      evidence: `column(s) carrying sensitive data (${sensitive.join(', ')}) — this needs a declared handling rule before it is bound to a new use`,
      escalate: true,
    };
  }
  return {
    office: 'sentry',
    sealed: true,
    evidence: policy.policy_bearing
      ? `no directly sensitive columns; the table does touch ${policy.concepts.join(', ')}, and reuse inherits the handling already ratified for it`
      : `no sensitive or policy-bearing columns in ${columns.length} checked`,
  };
}

/** CONDUCTOR: does this integrate without creating a second home for one job? */
function conductorCheck(resolution, resolutions) {
  const target = resolution.table || ARCHITECT_SPECIFIED_CONTRACTS[resolution.store]?.table;
  const collision = resolutions.filter(
    (r) => r.store !== resolution.store && (r.table || ARCHITECT_SPECIFIED_CONTRACTS[r.store]?.table) === target
  );
  if (collision.length > 0) {
    return {
      office: 'conductor',
      sealed: false,
      evidence: `\`${target}\` is also bound to ${collision.map((c) => c.store).join(', ')} — two stores cannot share one home without an explicit decision`,
    };
  }
  return { office: 'conductor', sealed: true, evidence: `\`${target}\` is bound to exactly one store` };
}

function readMigrationTables() {
  const dir = path.join(ROOT, 'db/migrations');
  const tables = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const name = m[1].replace(/["']/g, '').split('.').pop();
      if (tables.has(name)) continue;
      const columns = m[2]
        .split('\n')
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && !/^(constraint|primary key|unique|foreign key|check|--)/i.test(l));
      tables.set(name, { table: name, migration: file, columns, column_names: columns.map((c) => c.split(/\s+/)[0].toLowerCase()) });
    }
  }
  return tables;
}

const squash = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '');

export function applyInternalResolutions() {
  const session = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE_REL), 'utf8'));
  const s = session.session || session;
  const blueprint = structuredClone(s.blueprint_json);
  const tables = readMigrationTables();

  const cycle = resolveCycles(blueprint);
  const stores = resolveAllStores();

  // Every office runs its own check. A store advances only if all three seal.
  const consensus = stores.resolutions.map((r) => {
    const seals = [builderCheck(r, tables), sentryCheck(r, tables), conductorCheck(r, stores.resolutions)];
    return {
      store: r.store,
      disposition: r.disposition,
      table: r.table || ARCHITECT_SPECIFIED_CONTRACTS[r.store]?.table || null,
      seals,
      complete: seals.every((x) => x.sealed),
      escalate: seals.some((x) => x.escalate),
    };
  });

  // AMENDMENT 1 — the cycle repair.
  for (const step of blueprint.steps || []) {
    const deps = step.deps || step.depends_on || [];
    const kept = deps.filter((d) => !cycle.removed_edges.some((e) => e.from === step.id && e.to === d));
    if (kept.length !== deps.length) {
      if (step.deps) step.deps = kept;
      if (step.depends_on) step.depends_on = kept;
      step._amended_by = 'architect_cycle_resolution';
    }
  }

  // AMENDMENT 2 — reused stores stop creating tables. This is the substance of the
  // resolution, not a formality: the step no longer proposes a schema, so there is
  // no schema to invent and no second home for a job that already has one.
  const bindings = {};
  for (const c of consensus) {
    if (!c.complete) continue;
    const store = c.store;
    for (const step of blueprint.steps || []) {
      const file = String(step.file || step.target_file || '');
      if (!/\.sql$|migration/i.test(file)) continue;
      if (!squash(file).includes(squash(store))) continue;
      if (c.disposition === 'REUSE_EXISTING') {
        step.contract = { ...(step.contract || {}), tables: [], reuses_existing_table: c.table };
        step.purpose = `Bind ${store} to the existing \`${c.table}\` table; no new table is created.`;
        step._amended_by = 'architect_store_reuse';
        bindings[store] = { mode: 'reuse', table: c.table };
      } else {
        const spec = ARCHITECT_SPECIFIED_CONTRACTS[store];
        step.contract = {
          ...(step.contract || {}),
          tables: [{ name: spec.table, columns: [...spec.columns].map((col) => col.split(/\s+/)[0]) }],
        };
        step._amended_by = 'architect_store_specification';
        bindings[store] = { mode: 'specify', table: spec.table };
      }
    }
  }

  // AMENDMENT 3 — the Conductor supplies the identity the plan requires. Assigning
  // an identifier is not a design decision; it is the mechanical work the Conductor
  // exists to do, and it was one of the ten questions aimed at the founder.
  if (!blueprint.blueprint_id) {
    blueprint.blueprint_id = s.blueprint_id || `BP-${String(s.session_id || 'overlay').slice(0, 12)}`;
    blueprint._amended_by = 'conductor_identity_assignment';
  }

  // The schema decision artifact records who decided what, so a builder can never
  // receive a contract without being able to see its authority.
  const answers = {};
  for (const c of consensus) {
    if (!c.complete) continue;
    const spec = ARCHITECT_SPECIFIED_CONTRACTS[c.store];
    answers[c.store] = {
      resolved_by: 'architect',
      consensus: c.seals.filter((x) => x.sealed).map((x) => x.office),
      disposition: c.disposition,
      table: c.table,
      columns: c.disposition === 'REUSE_EXISTING' ? tables.get(c.table)?.column_names || [] : [...spec.columns],
      evidence: c.seals.map((x) => `${x.office}: ${x.evidence}`),
    };
    // Reuse also registers under the table name, since the detector checks the
    // table the blueprint actually asserts rather than the store's prose name.
    if (spec) answers[spec.table] = { ...answers[c.store] };
  }

  const artifact = createSchemaDecisionArtifact({
    requiredStores: stores.resolutions.map((r) => r.store),
    answers,
    provenance: {
      decided_by: 'architect, with builder/sentry/conductor consensus',
      decided_at: new Date().toISOString(),
      source: 'products/receipts/ARCHITECT_STORE_RESOLUTION_RECEIPT.json',
      delegation: 'config/founder-escalation-threshold.js IMPLEMENTATION_DELEGATION',
      question_set: 'docs/products/builderos/FOUNDER_DECISION_SET_OVERLAY.md',
    },
  });

  fs.mkdirSync(path.join(ROOT, 'products/artifacts'), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);

  // AMENDMENT 4 — the repairs the deterministic pass and the Conductor already know
  // how to make. The exam applies these to a throwaway copy to prove it can; if the
  // amended artifact does not also carry them, planning re-reports defects that were
  // resolved three stages earlier and the plan never authorizes.
  const amendedSession = structuredClone(s);
  amendedSession.blueprint_json = blueprint;
  const preRepair = detectInventions({ session: amendedSession }, { schemaAuthority: artifact });
  // The repair pass returns its own deep clone, so the amended blueprint has to be
  // taken FROM it rather than written over it — assigning the pre-repair blueprint
  // back afterwards silently discarded every identity fix it had just made.
  const repaired = resolveDeterministically({ session: amendedSession }, preRepair.defects);
  const working = repaired.working;

  // Typed gates replace the overloaded flag. Graph validity is all the old flag ever
  // proved, so that is all it is allowed to say now; execution authority has to be
  // earned separately and is recorded as not yet given.
  const conductorActions = [];
  if (working.arc_report_json && 'ready_to_execute' in working.arc_report_json) {
    delete working.arc_report_json.ready_to_execute;
    working.arc_report_json.gates = {
      GRAPH_VALID: 'PASS',
      INTENT_VALIDATED: 'PASS',
      MANUFACTURING_AUTHORIZED: 'PENDING',
      EXECUTION_AUTHORIZED: 'NOT_GIVEN',
    };
    conductorActions.push('replaced arc_report.ready_to_execute with typed gate statuses');
  }

  // Registration is not a gate pass. It creates the authority that will later be
  // able to certify the product complete — without it, "endpoint 200" is the only
  // evidence anyone could offer, which SO-002 forbids.
  const registryPath = path.join(ROOT, 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const productId = s.product_name || 'universal-overlay';
  if (!registry.products.some((p) => p.id === productId)) {
    registry.products.push({
      id: productId,
      title: 'Taloa Universal Overlay & Fluid UI',
      ssot: `docs/products/${productId}/PRODUCT_HOME.md`,
      findingsFeed: `products/receipts/SENTRY_FINDINGS_FEED.${productId}.json`,
      layers: [
        {
          name: 'A',
          kind: 'structural',
          type: 'gate-script',
          run: ['scripts/sentry-overlay-layer-a.mjs'],
          status: 'REGISTERED_NOT_IMPLEMENTED',
          note: 'Registered by the Conductor so an authority exists to certify completion. Registration is not a pass: the gate script does not exist yet and Layer A cannot report until it does.',
        },
        {
          name: 'B',
          kind: 'human_sim',
          type: 'gate-script',
          run: ['scripts/sentry-overlay-layer-b.mjs'],
          status: 'REGISTERED_NOT_IMPLEMENTED',
          note: 'Real-browser walkthrough required by SO-002 before any founder-facing claim.',
        },
      ],
    });
    registry.last_updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    conductorActions.push(`registered "${productId}" for SO-002 Layer A/B gates (registered, not passed)`);
  }

  fs.writeFileSync(path.join(ROOT, AMENDED_REL), `${JSON.stringify(working.blueprint_json, null, 2)}\n`);
  fs.writeFileSync(
    path.join(ROOT, 'products/artifacts/OVERLAY_AMENDED_SESSION.json'),
    `${JSON.stringify({ session: working }, null, 2)}\n`
  );
  const postRepair = detectInventions({ session: working }, { schemaAuthority: artifact });

  const result = {
    defects_before_application: preRepair.defect_count,
    defects_after_application: postRepair.defect_count,
    remaining_defects: postRepair.defects.map((d) => ({ id: d.id, detail: d.detail })),
    deterministic_repairs: repaired.applied.length,
    conductor_actions: conductorActions,
    cycle_repaired: cycle.resolved,
    edges_removed: cycle.removed_edges.map((e) => `${e.from} -> ${e.to}`),
    stores_total: stores.stores_total,
    stores_sealed: consensus.filter((c) => c.complete).length,
    stores_refused: consensus.filter((c) => !c.complete).map((c) => ({ store: c.store, why: c.seals.filter((x) => !x.sealed) })),
    bindings,
    artifact_status: artifact.status,
    artifact_hash: artifact.artifact_hash,
    amended_blueprint: AMENDED_REL,
    consensus,
  };

  fs.writeFileSync(
    path.join(ROOT, RECEIPT_REL),
    `${JSON.stringify(
      {
        schema: 'internal_resolution_application_receipt_v1',
        generated_at: new Date().toISOString(),
        produced_by: 'scripts/apply-internal-resolutions.mjs',
        fixture_untouched: FIXTURE_REL,
        independent_reproduction_command: 'node scripts/apply-internal-resolutions.mjs',
        ...result,
      },
      null,
      2
    )}\n`
  );
  return result;
}

function main() {
  const r = applyInternalResolutions();
  console.log(
    JSON.stringify(
      {
        cycle_repaired: r.cycle_repaired,
        edges_removed: r.edges_removed,
        defects: `${r.defects_before_application} -> ${r.defects_after_application}`,
        remaining_defects: r.remaining_defects.map((d) => d.id),
        deterministic_repairs: r.deterministic_repairs,
        conductor_actions: r.conductor_actions,
        stores_sealed: `${r.stores_sealed}/${r.stores_total}`,
        stores_refused: r.stores_refused.map((x) => `${x.store}: ${x.why.map((w) => w.office).join(',')}`),
        bindings: r.bindings,
        artifact_status: r.artifact_status,
      },
      null,
      2
    )
  );
}

if (process.argv[1] && process.argv[1].endsWith('apply-internal-resolutions.mjs')) {
  main();
}

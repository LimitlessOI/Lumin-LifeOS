#!/usr/bin/env node
/**
 * SYNOPSIS: Produces the two-factory manufacturing plan — how the project is
 * split between two builders and how the pieces come back together.
 *
 * The Conductor proposes the decomposition and assignment, the Architect checks
 * that assembling these pieces in this order actually yields the specified
 * system, and the Builder attests it can be manufactured without unstated
 * decisions. All three seal, or nothing is authorized.
 *
 * It also reports the honest speedup. Two factories do not halve the time —
 * dependencies decide that, and a chain of five slices is five waves no matter
 * how many builders are standing around. Reporting the real number is the
 * difference between planning and wishing.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileManufacturingPlan, verifyManufacturingPlan } from './manufacturing-plan.mjs';
import { scheduleWaves, parallelismMetrics, accountForSteps, BLOCKER_ORIGIN } from './plan-topology.mjs';
import { verifySchemaAuthority, loadSchemaDecisionArtifact } from './schema-decision-artifact.mjs';
import { resolveCycles } from './architect-resolve-cycle.mjs';
import { resolveAllStores } from './architect-resolve-stores.mjs';
import { sealManufacturingPlan } from './seal-manufacturing-plan.mjs';
import { allocate } from './factory-allocation.mjs';
import { ownerFor } from '../config/lane-assignment.js';
import { REQUIRED_CONSENSUS_OFFICES } from '../config/manufacturing-plan-schema.js';
import { detectInventions } from '../services/blueprint-invention-detector.js';
import { activeFactories } from '../config/factory-registry.js';
import { stepDependencies } from '../config/step-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE =
  'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json';
const RECEIPT_REL = 'products/receipts/TWO_FACTORY_PLAN_RECEIPT.json';
const PLAN_MD = 'docs/products/universal-overlay/TWO_FACTORY_BUILD_PLAN.md';

function loadBlueprint() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8'));
  const session = raw.session || raw;
  // Plan against the amended blueprint when the Offices have produced one. The
  // fixture stays frozen as the regression exam; planning from it after the
  // resolutions exist would report blockers that have already been resolved.
  const amendedPath = path.join(ROOT, 'products/artifacts/OVERLAY_AMENDED_SESSION.json');
  if (fs.existsSync(amendedPath)) {
    const amended = JSON.parse(fs.readFileSync(amendedPath, 'utf8'));
    const inner = amended.session || amended;
    return {
      session: amended,
      blueprint: inner.blueprint_json,
      planning_from: 'products/artifacts/OVERLAY_AMENDED_SESSION.json',
    };
  }
  return { session: raw, blueprint: session.blueprint_json, planning_from: FIXTURE };
}

function steps0(blueprint) {
  return (blueprint.steps || []).map((s) => ({ id: s.id, deps: stepDependencies(s), step: s }));
}

export function planTwoFactoryBuild() {
  const { session, blueprint, planning_from } = loadBlueprint();
  const factories = activeFactories().map((f) => f.factory_id);
  if (factories.length < 2) {
    return { ok: false, reason: `only ${factories.length} healthy factory lane(s) — nothing to split` };
  }

  // CONDUCTOR: decomposition, waves, assignment.
  const plan = compileManufacturingPlan(blueprint, { factories });

  // The compiler refuses to schedule a cyclic graph, which is correct but leaves
  // nothing to look at. Schedule the part that IS resolvable and name the knot,
  // so the founder sees the real parallel plan alongside the real blocker.
  // The Architect's cycle repair is applied here rather than being asked about.
  // It removes only edges whose target appears nowhere in the dependent step's own
  // factory signature, which is why this is a proof and not a preference — see
  // scripts/architect-resolve-cycle.mjs.
  const cycleRepair = resolveCycles(blueprint);
  const removedEdge = (from, to) => cycleRepair.removed_edges.some((e) => e.from === from && e.to === to);
  const schedule = scheduleWaves(
    steps0(blueprint).map((n) => ({ id: n.id, depends_on: n.deps.filter((d) => !removedEdge(n.id, d)) }))
  );
  // Parallel split by path. Redundant-independent of the same file is forbidden
  // by LANE_ASSIGNMENT (git-lock) and would not raise confidence while the
  // lanes share node_modules (1.0 effective perspectives).
  const allocation = allocate(plan, {
    factories,
    redundancy_for_high_risk: false,
    ownerFor,
  });

  // ARCHITECT: does this decomposition still describe the specified system?
  const schemaArtifact = loadSchemaDecisionArtifact();
  const inventionReport = detectInventions(session, {
    schemaAuthority: schemaArtifact.ok ? schemaArtifact.artifact : null,
  });
  // A store the Architect lawfully resolved — by reusing an existing canonical
  // table, or by specifying a contract with nothing policy-bearing in it — is no
  // longer a founder blocker. Only a store that genuinely encodes his policy stays
  // blocked, and then it is blocked on a policy question rather than on a schema.
  const storeResolution = resolveAllStores();
  const resolvedStores = new Set(
    storeResolution.resolutions.filter((r) => !r.escalates).map((r) => String(r.store).toLowerCase())
  );
  const blockedSubjects = new Set(
    inventionReport.defects
      .filter((d) => d.id === 'INVENTED_SQL_SCHEMA')
      .map((d) => String(d.table).toLowerCase())
      .filter((t) => !resolvedStores.has(t))
  );
  const steps = blueprint.steps || [];
  const blockedSteps = new Set(
    steps
      .filter((s) => {
        const text = JSON.stringify(s).toLowerCase();
        const file = String(s.file || s.target_file || '').toLowerCase();
        if (!/\.sql$|migration/.test(file)) return false;
        // The fixture names the store in the migration filename ("..._create_
        // task_store_table.sql"), not in CREATE TABLE text, and the detector
        // reports it as "TaskStore" — so both sides need the separators
        // stripped before they can be compared at all.
        const squash = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
        const squashedFile = squash(file);
        return [...blockedSubjects].some((t) => squashedFile.includes(squash(t)));
      })
      .map((s) => s.id)
  );
  // A slice is buildable now only if nothing it depends on is blocked.
  const byId = new Map(steps.map((s) => [s.id, s]));
  const isBlocked = (id, seen = new Set()) => {
    if (blockedSteps.has(id)) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return stepDependencies(byId.get(id) || {}).some((d) => isBlocked(d, seen));
  };

  const waveOf = new Map();
  schedule.waves.forEach((ids, i) => ids.forEach((id) => waveOf.set(id, i)));

  const sliceRows = plan.slices.map((s) => {
    const assignment = allocation.assignments.find((a) => a.slice_id === s.slice_id);
    const stepId = s.steps?.[0] ?? s.slice_id;
    return {
      slice_id: s.slice_id,
      target: s.target_files?.[0] ?? null,
      wave: waveOf.has(s.steps?.[0]) ? waveOf.get(s.steps[0]) : null,
      factories: assignment?.factory_ids ?? [],
      mode: assignment?.mode ?? null,
      buildable_now: !isBlocked(stepId),
      // Blocked-by-Origin: without this, a blueprint that cannot execute at all
      // is indistinguishable from slow factories, and the factories get blamed.
      blocker_origin: schedule.unschedulable.includes(stepId)
        ? BLOCKER_ORIGIN.ARCHITECTURE
        : isBlocked(stepId)
          ? BLOCKER_ORIGIN.FOUNDER_DECISION
          : null,
    };
  });

  const blockedByOrigin = sliceRows.reduce((acc, row) => {
    if (!row.blocker_origin) return acc;
    acc[row.blocker_origin] = (acc[row.blocker_origin] || 0) + 1;
    return acc;
  }, {});

  // BUILDER: manufacturability, then all three seal.
  let sealed = plan;
  const sealErrors = [];
  for (const office of REQUIRED_CONSENSUS_OFFICES) {
    try {
      ({ plan: sealed } = sealManufacturingPlan({ plan: sealed, office, blueprint }));
    } catch (err) {
      sealErrors.push({ office, error: err.message });
    }
  }
  const authorization = verifyManufacturingPlan(sealed, blueprint, { inventionReport });

  // Honest speedup: dependencies set the floor, not head count.
  const metrics = parallelismMetrics(schedule.waves, factories.length);
  const scheduled = metrics.scheduled_steps;
  const criticalPath = metrics.critical_path_floor;
  const widest = metrics.max_theoretical_parallelism;
  const withTwo = metrics.expected_makespan_units;

  // If 16 steps enter planning, 16 must appear in the report.
  const stepOfSlice = (sliceId) => plan.slices.find((sl) => sl.slice_id === sliceId)?.steps?.[0];
  const accounting = accountForSteps({
    sourceStepIds: steps.map((st) => st.id),
    scheduled: sliceRows.filter((r) => r.buildable_now && !schedule.unschedulable.includes(stepOfSlice(r.slice_id))).map((r) => stepOfSlice(r.slice_id)),
    blocked: sliceRows.filter((r) => r.blocker_origin === BLOCKER_ORIGIN.FOUNDER_DECISION).map((r) => stepOfSlice(r.slice_id)),
    cyclic: schedule.unschedulable,
  });

  const schemaAuthority = verifySchemaAuthority({
    requiredStores: inventionReport.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA').map((d) => d.table),
  });

  return {
    ok: true,
    factories,
    slices: plan.slices.length,
    waves: criticalPath,
    schedulable_steps: scheduled,
    unschedulable_steps: schedule.unschedulable,
    widest_wave: widest,
    buildable_now: sliceRows.filter((r) => r.buildable_now).length,
    blocked_on_founder_answers: sliceRows.filter((r) => !r.buildable_now).length,
    speedup: {
      one_factory_units: scheduled,
      two_factory_units: withTwo,
      critical_path_floor: criticalPath,
      note:
        withTwo === scheduled
          ? 'No speedup available: the graph is a chain, so a second builder waits. Splitting the blueprint differently is the only way to parallelize it.'
          : `${(scheduled / withTwo).toFixed(2)}x, floored at ${criticalPath} by the dependency chain — extra builders cannot beat the critical path.`,
    },
    parallelism: metrics,
    planning_from,
    blocked_by_origin: blockedByOrigin,
    internal_resolution: {
      cycle_repaired: cycleRepair.resolved,
      cycle_edges_removed: cycleRepair.removed_edges.map((e) => `${e.from} -> ${e.to}`),
      stores_reusing_existing: storeResolution.reuse_existing,
      stores_architect_specifies: storeResolution.architect_specifies,
      stores_escalated_to_founder: storeResolution.escalated_to_founder,
    },
    step_accounting: accounting,
    schema_authority: {
      ok: schemaAuthority.ok,
      status: schemaAuthority.artifact?.status ?? 'NO_ARTIFACT',
      artifact_hash: schemaAuthority.artifact?.artifact_hash ?? null,
      defects: schemaAuthority.defects.map((d) => d.id),
    },
    allocation_violations: allocation.violations,
    seal_errors: sealErrors,
    authorized: authorization.manufacturing_authorized,
    authorization_state: authorization.state,
    blocking_defects: authorization.defects?.map((d) => d.id) ?? [],
    slice_rows: sliceRows,
    integration_points: plan.integration_points ?? [],
  };
}

function renderMarkdown(r) {
  const lines = [
    '<!-- SYNOPSIS: Generated by scripts/plan-two-factory-build.mjs. Do not hand-edit. -->',
    '',
    '# Two-factory build plan — Overlay',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)}. Conductor decomposition, Architect fidelity check, Builder manufacturability — all three seal or nothing is authorized.`,
    '',
    `**Lanes:** ${r.factories.join(', ')} · **Slices:** ${r.slices} · **Waves:** ${r.waves} · **Widest wave:** ${r.widest_wave}`,
    '',
    '## Speed',
    '',
    `One lane: ${r.speedup.one_factory_units} units. Two lanes: ${r.speedup.two_factory_units} units. ${r.speedup.note}`,
    '',
    `Maximum theoretical parallelism ${r.parallelism.max_theoretical_parallelism} · effective parallelism ${r.parallelism.effective_parallelism} · critical-path floor ${r.parallelism.critical_path_floor} · lane utilization ${r.parallelism.lane_utilization}. Units are steps, not minutes: this is the shape of the dependency graph, not a duration estimate.`,
    '',
    '## Where the blockers actually come from',
    '',
    'Reported per blocked slice so nobody can later attribute a blueprint that cannot execute to slow factories.',
    '',
    ...Object.entries(r.blocked_by_origin).map(([origin, count]) => `- **${origin.replace(/_/g, ' ')}** — ${count} slice(s)`),
    '',
    `Every one of the ${r.step_accounting.source_step_count} source steps is accounted for exactly once (${r.step_accounting.complete ? 'coverage invariant holds' : 'COVERAGE INCOMPLETE'}): ${Object.entries(r.step_accounting.counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ')}.`,
    '',
    `Schema authority: **${r.schema_authority.status}**${r.schema_authority.artifact_hash ? ` (artifact \`${r.schema_authority.artifact_hash.slice(0, 12)}\`)` : ''}. Both lanes must build against this one frozen artifact, so that a disagreement between them can be read as builder divergence rather than two different readings of the same silence.`,
    '',
    '## What can be built the moment the blueprint is answered',
    '',
    `${r.buildable_now} of ${r.slices} slices are buildable now; ${r.blocked_on_founder_answers} wait on the founder decision set.`,
    '',
    '## Assignment by wave',
    '',
  ];
  for (let w = 0; w < r.waves; w += 1) {
    const rows = r.slice_rows.filter((s) => s.wave === w);
    lines.push(`**Wave ${w + 1}** — ${rows.length} slice(s), runs in parallel:`, '');
    for (const s of rows) {
      lines.push(
        `- \`${s.slice_id}\` → ${s.factories.join(' + ') || 'unassigned'}${s.mode === 'redundant_independent' ? ' *(both, independently — high risk)*' : ''}${s.buildable_now ? '' : ' — **blocked on a founder answer**'}`
      );
    }
    lines.push('');
  }
  const knot = r.unschedulable_steps || [];
  if (knot.length) {
    lines.push(
      '## Not schedulable at all',
      '',
      `${knot.length} step(s) belong to no wave because they depend on each other in a circle: ${knot.map((k) => `\`${k}\``).join(', ')}. No number of builders can start a step that waits on itself. An office has to break the cycle before this part of the blueprint can be manufactured.`,
      ''
    );
  }
  lines.push(
    '## Putting it back together',
    '',
    'Each wave is an integration point: nothing from wave N+1 starts until every slice in wave N has landed and verified. Assignment is parallel-split by path (`LANE_ASSIGNMENT.json`): a file is owned by exactly one lane. Redundant-independent of the same file is off while the lanes share `node_modules` — agreement would not raise confidence.',
    '',
    `**Authorization:** ${r.authorized ? 'MANUFACTURING_AUTHORIZED' : `withheld — ${r.blocking_defects.join(', ') || r.authorization_state}`}`,
    ''
  );
  return lines.join('\n');
}

function main() {
  const r = planTwoFactoryBuild();
  if (!r.ok) {
    console.error(r.reason);
    process.exit(1);
  }
  fs.writeFileSync(path.join(ROOT, PLAN_MD), `${renderMarkdown(r)}\n`);
  const receipt = {
    schema: 'two_factory_plan_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/plan-two-factory-build.mjs',
    independent_reproduction_command: 'node scripts/plan-two-factory-build.mjs',
    plan_document: PLAN_MD,
    ...r,
  };
  fs.writeFileSync(path.join(ROOT, RECEIPT_REL), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        factories: r.factories,
        slices: r.slices,
        waves: r.waves,
        widest_wave: r.widest_wave,
        buildable_now: r.buildable_now,
        blocked: r.blocked_on_founder_answers,
        speedup: r.speedup,
        blocked_by_origin: r.blocked_by_origin,
        step_accounting_complete: r.step_accounting.complete,
        schema_authority: r.schema_authority,
        authorized: r.authorized,
        blocking: r.blocking_defects,
        plan: PLAN_MD,
      },
      null,
      2
    )
  );
}

if (process.argv[1] && process.argv[1].endsWith('plan-two-factory-build.mjs')) {
  main();
}

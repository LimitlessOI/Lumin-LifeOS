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
import { sealManufacturingPlan } from './seal-manufacturing-plan.mjs';
import { allocate } from './factory-allocation.mjs';
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
  return { session: raw, blueprint: session.blueprint_json };
}

function steps0(blueprint) {
  return (blueprint.steps || []).map((s) => ({ id: s.id, deps: stepDependencies(s), step: s }));
}

/**
 * Kahn's algorithm, stopped honestly. Whatever still has unmet dependencies when
 * no further progress is possible is the knot — reported, not silently dropped.
 */
function scheduleWhatWeCan(nodes) {
  const remaining = new Map(nodes.map((n) => [n.id, new Set(n.deps)]));
  const done = new Set();
  const waves = [];
  for (;;) {
    const ready = [...remaining.entries()].filter(([, deps]) => [...deps].every((d) => done.has(d))).map(([id]) => id);
    if (ready.length === 0) break;
    waves.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      done.add(id);
    }
  }
  return { waves, unschedulable: [...remaining.keys()] };
}

export function planTwoFactoryBuild() {
  const { session, blueprint } = loadBlueprint();
  const factories = activeFactories().map((f) => f.factory_id);
  if (factories.length < 2) {
    return { ok: false, reason: `only ${factories.length} healthy factory lane(s) — nothing to split` };
  }

  // CONDUCTOR: decomposition, waves, assignment.
  const plan = compileManufacturingPlan(blueprint, { factories });

  // The compiler refuses to schedule a cyclic graph, which is correct but leaves
  // nothing to look at. Schedule the part that IS resolvable and name the knot,
  // so the founder sees the real parallel plan alongside the real blocker.
  const schedule = scheduleWhatWeCan(steps0(blueprint));
  const allocation = allocate(plan, { factories, redundancy_for_high_risk: true });

  // ARCHITECT: does this decomposition still describe the specified system?
  const inventionReport = detectInventions(session);
  const blockedSubjects = new Set(
    inventionReport.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA').map((d) => String(d.table).toLowerCase())
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
    };
  });

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
  const scheduled = schedule.waves.flat().length;
  const criticalPath = schedule.waves.length;
  const widest = schedule.waves.length ? Math.max(...schedule.waves.map((w) => w.length)) : 0;
  const withTwo = schedule.waves.reduce((n, w) => n + Math.ceil(w.length / factories.length), 0);

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
    'Each wave is an integration point: nothing from wave N+1 starts until every slice in wave N has landed and verified. High-risk slices are given to both lanes independently — convergence raises confidence, divergence goes to the Consensus Protocol rather than a vote.',
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

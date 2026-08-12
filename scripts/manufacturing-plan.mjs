#!/usr/bin/env node
/**
 * SYNOPSIS: Compiles and verifies the Manufacturing Plan, and decides
 * FACTORY_READY / MANUFACTURING_AUTHORIZED deterministically.
 *
 * The founder identified a missing stage between "Factory Ready" and "put it in
 * the queue". This is it. Every check is a pure function of the blueprint and the
 * plan, so the answer cannot be negotiated with a model, and the compiler is kept
 * separate from the verifier: the compiler proposes, the verifier decides, and the
 * verifier re-derives waves itself rather than trusting the ones it was handed.
 *
 * Sealing is deliberately NOT here. This module can verify a seal and cannot mint
 * one — the same separation that closed OPEN-7, applied to the three-party
 * consensus: no office may manufacture the evidence of its own approval.
 *
 * Usage:
 *   node scripts/manufacturing-plan.mjs compile --blueprint <path.json> [--out <path.json>]
 *   node scripts/manufacturing-plan.mjs verify  --plan <path.json> --blueprint <path.json>
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stepDependencies,
  findDependencyKeyContradictions,
} from '../config/step-dependencies.js';
import {
  REQUIRED_CONSENSUS_OFFICES,
  GATE_STATE,
  FAILURE_DISPOSITION,
  DEFAULT_FAILURE_DISPOSITION,
  REQUIRED_PLAN_FIELDS,
  REQUIRED_SLICE_FIELDS,
  PLAN_DEFECT,
  PLAN_DEFECT_AUTHORITY,
} from '../config/manufacturing-plan-schema.js';
import { topologyReport, accountForSteps, findCycles, STEP_DISPOSITION } from './plan-topology.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Canonical JSON: sorted keys, no insignificant whitespace. Same rule as the seal path. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Hash covers the plan's substance only — seals and metadata must not change it. */
export function manufacturingPlanHash(plan) {
  const { consensus_seals, plan_hash, generated_at, ...substance } = plan || {};
  return sha256(canonicalJson(substance));
}

export function blueprintHash(blueprint) {
  return sha256(canonicalJson(blueprint));
}

function stepId(step) {
  return step?.id || step?.step_id || null;
}

function stepTarget(step) {
  return step?.file || step?.target_file || step?.path || null;
}

/**
 * Topological levels. Level N contains everything whose dependencies all sit in
 * levels < N, which is exactly "what can run at the same time".
 */
export function computeWaves(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const level = new Map();
  const visiting = new Set();
  let cycle = null;

  const depth = (id, trail = []) => {
    if (level.has(id)) return level.get(id);
    if (visiting.has(id)) {
      cycle = [...trail.slice(trail.indexOf(id)), id];
      return 0;
    }
    visiting.add(id);
    let max = 0;
    for (const dep of byId.get(id)?.depends_on || []) {
      if (!byId.has(dep)) continue;
      max = Math.max(max, depth(dep, [...trail, id]) + 1);
      if (cycle) break;
    }
    visiting.delete(id);
    level.set(id, max);
    return max;
  };

  for (const n of nodes) {
    depth(n.id);
    if (cycle) break;
  }
  if (cycle) return { cycle, waves: [] };

  const waves = [];
  for (const [id, lvl] of level) {
    waves[lvl] = waves[lvl] || [];
    waves[lvl].push(id);
  }
  return { cycle: null, waves: waves.map((ids) => ids.sort()) };
}

/**
 * Propose a plan from a blueprint. One slice per step is the honest default: any
 * coarser grouping is a judgment call about what belongs together, and this
 * compiler has no authority to make it. The Conductor may merge slices; the
 * verifier re-checks whatever it is given.
 */
export function compileManufacturingPlan(blueprint, { factories = ['factory-1'] } = {}) {
  const steps = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  const nodes = steps.map((s) => ({ id: stepId(s), depends_on: stepDependencies(s) }));
  // Schedule the part that resolves and name the part that does not. Returning
  // an empty schedule on the first cycle reports a mostly-fine graph as totally
  // unschedulable, which reads identically to a broken scheduler.
  const topology = topologyReport(nodes, {
    declaredCycles: blueprint?._meta?.declared_cycles || blueprint?.declared_cycles || [],
    laneCount: factories.length,
  });
  const waves = topology.waves;
  const cycle = topology.cycles.length ? topology.cycles[0].members : null;

  const slices = steps.map((s, i) => {
    const id = stepId(s);
    const target = stepTarget(s);
    return {
      slice_id: `SL-${String(i + 1).padStart(3, '0')}`,
      steps: [id],
      depends_on: stepDependencies(s),
      target_files: target ? [target] : [],
      acceptance: s.acceptance || blueprint?._meta?.acceptance_cmd || null,
      verification: s.verification || 'sentry_layer_a',
      failure_disposition: DEFAULT_FAILURE_DISPOSITION,
      // Round-robin is a placeholder assignment, not a capability decision.
      // Capability-based allocation is the Conductor's call with Efficiency
      // Officer input; inventing it here would be exactly the overreach the
      // no-invention law forbids.
      assigned_factory: factories[i % factories.length],
      assignment_basis: 'round_robin_placeholder_pending_conductor_decision',
    };
  });

  const sliceByStep = new Map();
  for (const sl of slices) for (const st of sl.steps) sliceByStep.set(st, sl.slice_id);

  // A step that more than one other step depends on is where work rejoins, which
  // is where integration actually has to be proven.
  const dependents = new Map();
  for (const n of nodes) {
    for (const d of n.depends_on) dependents.set(d, (dependents.get(d) || 0) + 1);
  }
  const integrationPoints = [...dependents.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ step_id: id, slice_id: sliceByStep.get(id) || null, dependent_count: count }));

  // Two slices writing the same file in the same wave is the git-lock/staging
  // contamination failure already observed live between concurrent sessions.
  const collisions = [];
  for (const wave of waves) {
    const owners = new Map();
    for (const stepIdInWave of wave) {
      const sl = slices.find((s) => s.steps.includes(stepIdInWave));
      for (const f of sl?.target_files || []) {
        if (!owners.has(f)) owners.set(f, []);
        owners.get(f).push(sl.slice_id);
      }
    }
    for (const [file, sliceIds] of owners) {
      if (sliceIds.length > 1) collisions.push({ file, wave_index: waves.indexOf(wave), slices: sliceIds });
    }
  }

  const plan = {
    schema: 'manufacturing_plan_v1',
    plan_id: `MP-${blueprint?.blueprint_id || blueprint?._meta?.product || 'unknown'}`,
    blueprint_id: blueprint?.blueprint_id || blueprint?._meta?.blueprint_id || null,
    blueprint_hash: blueprintHash(blueprint),
    product_id: blueprint?._meta?.product || blueprint?.product_name || null,
    terminology_version: blueprint?._meta?.terminology_version || '2026-08-11',
    slices,
    waves: waves.map((ids, i) => ({
      wave_index: i,
      slice_ids: ids.map((s) => sliceByStep.get(s)).filter(Boolean),
      parallel_safe: !collisions.some((c) => c.wave_index === i),
    })),
    integration_points: integrationPoints,
    collision_risks: collisions,
    factory_assignment: { factories, strategy: 'round_robin_placeholder' },
    compiled_by: 'scripts/manufacturing-plan.mjs',
    dependency_cycle: cycle,
    dependency_cycles: topology.cycles,
    unschedulable_steps: topology.unschedulable_steps,
    parallelism: topology.parallelism,
    step_accounting: accountForSteps({
      sourceStepIds: nodes.map((n) => n.id),
      scheduled: waves.flat(),
      cyclic: topology.unschedulable_steps,
    }),
  };
  plan.plan_hash = manufacturingPlanHash(plan);
  return plan;
}

/**
 * Decide. Returns every defect found, each routed to the office that must fix it,
 * because a review that stops at the first problem forces the founder to run the
 * loop N times — the exact failure the whole-blueprint readiness review exists to
 * prevent.
 */
export function verifyManufacturingPlan(plan, blueprint, { inventionReport = null } = {}) {
  const defects = [];
  const flag = (id, detail, extra = {}) =>
    defects.push({ id, authority: PLAN_DEFECT_AUTHORITY[id] || 'conductor', detail, ...extra });

  for (const f of REQUIRED_PLAN_FIELDS) {
    if (plan?.[f] === undefined || plan?.[f] === null) {
      flag(PLAN_DEFECT.MISSING_FIELD, `plan is missing required field \`${f}\``, { field: f });
    }
  }

  const steps = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  const blueprintStepIds = steps.map(stepId).filter(Boolean);

  if (plan?.blueprint_hash && blueprint && plan.blueprint_hash !== blueprintHash(blueprint)) {
    flag(
      PLAN_DEFECT.BLUEPRINT_HASH_MISMATCH,
      'plan was compiled against different blueprint bytes — a stale plan authorizes work nobody approved',
      { plan_hash_of_blueprint: plan.blueprint_hash, actual: blueprintHash(blueprint) }
    );
  }

  const contradictions = findDependencyKeyContradictions(steps);
  for (const c of contradictions) {
    flag(PLAN_DEFECT.CONTRADICTORY_DEPENDENCY_KEYS, c.detail, { step_id: c.step_id, keys: c.keys });
  }

  const slices = Array.isArray(plan?.slices) ? plan.slices : [];
  const covered = new Map();
  for (const sl of slices) {
    for (const f of REQUIRED_SLICE_FIELDS) {
      if (sl?.[f] === undefined || sl?.[f] === null) {
        flag(PLAN_DEFECT.MISSING_SLICE_FIELD, `slice \`${sl?.slice_id}\` is missing \`${f}\``, {
          slice_id: sl?.slice_id,
          field: f,
        });
      }
    }
    if (sl?.assigned_factory === '' || sl?.assigned_factory === null) {
      flag(PLAN_DEFECT.UNASSIGNED_SLICE, `slice \`${sl?.slice_id}\` has no assigned factory`, {
        slice_id: sl?.slice_id,
      });
    }
    if (sl?.failure_disposition && !Object.values(FAILURE_DISPOSITION).includes(sl.failure_disposition)) {
      flag(
        PLAN_DEFECT.INVALID_FAILURE_DISPOSITION,
        `slice \`${sl.slice_id}\` declares unknown failure_disposition \`${sl.failure_disposition}\``,
        { slice_id: sl.slice_id }
      );
    }
    for (const st of sl?.steps || []) {
      if (!blueprintStepIds.includes(st)) {
        flag(PLAN_DEFECT.UNKNOWN_STEP_IN_SLICE, `slice \`${sl.slice_id}\` names step \`${st}\` that the blueprint does not contain`, {
          slice_id: sl.slice_id,
          step_id: st,
        });
      }
      covered.set(st, (covered.get(st) || 0) + 1);
    }
  }

  for (const id of blueprintStepIds) {
    if (!covered.has(id)) {
      flag(PLAN_DEFECT.STEP_NOT_COVERED, `blueprint step \`${id}\` appears in no slice — it would never be built`, {
        step_id: id,
      });
    } else if (covered.get(id) > 1) {
      flag(PLAN_DEFECT.STEP_COVERED_TWICE, `blueprint step \`${id}\` is claimed by ${covered.get(id)} slices`, {
        step_id: id,
      });
    }
  }

  // Re-derive the graph rather than trusting the plan's own waves.
  const sliceNodes = slices.map((sl) => ({ id: sl.slice_id, depends_on: sliceDeps(sl, slices, steps) }));
  const { cycle, waves } = computeWaves(sliceNodes);
  if (cycle) {
    flag(PLAN_DEFECT.DEPENDENCY_CYCLE, `dependency cycle: ${cycle.join(' -> ')}`, { cycle });
  }

  // Independent topological validation against the FROZEN SOURCE, not against the
  // plan's own normalized slices. A plan derived from a cyclic blueprint can look
  // internally consistent, which is how a blueprint marked `ready_to_execute`
  // shipped a knot of five impossible steps.
  const sourceNodes = steps.map((s) => ({ id: stepId(s), depends_on: stepDependencies(s) }));
  const declaredCycles = blueprint?._meta?.declared_cycles || blueprint?.declared_cycles || [];
  const sourceCycles = findCycles(sourceNodes);
  for (const members of sourceCycles) {
    const declared = declaredCycles.find(
      (d) => Array.isArray(d?.members) && d.members.length === members.length && [...d.members].sort().every((m, i) => m === members[i])
    );
    if (!declared) {
      flag(
        PLAN_DEFECT.UNDECLARED_DEPENDENCY_CYCLE,
        `source dependency graph contains a strongly connected component of ${members.length} steps that no office declared: ${members.join(' -> ')} -> ${members[0]}. No builder can start a step that waits on itself.`,
        { members, origin: 'architecture' }
      );
    } else if (!declared.iterative_execution_contract) {
      flag(
        PLAN_DEFECT.CYCLE_MISSING_ITERATIVE_CONTRACT,
        `cycle ${members.join(', ')} is declared but carries no iterative execution contract stating how many passes it takes and what makes it terminate`,
        { members, origin: 'architecture' }
      );
    }
  }

  // If N steps enter planning, N must appear in the report. This is the invariant
  // that catches an analysis silently omitting whatever it could not classify.
  const accounting =
    plan?.step_accounting ||
    accountForSteps({
      sourceStepIds: sourceNodes.map((n) => n.id),
      scheduled: (plan?.waves || []).flatMap((w) => w.slice_ids || []),
    });
  if (!accounting.complete) {
    flag(
      PLAN_DEFECT.SOURCE_COVERAGE_INCOMPLETE,
      `plan accounts for ${accounting.accounted_count} of ${accounting.source_step_count} source steps; every step must appear in exactly one of ${Object.values(STEP_DISPOSITION).join(', ')}`,
      {
        unaccounted_steps: accounting.unaccounted_steps,
        double_counted_steps: accounting.double_counted_steps,
        steps_not_in_source: accounting.steps_not_in_source,
      }
    );
  }

  if (plan?.parallelism && typeof plan.parallelism.expected_speedup_x !== 'number') {
    flag(
      PLAN_DEFECT.MISSING_PARALLELISM_METRICS,
      'plan reports parallelism without an expected speedup — lane count on its own is a vanity metric',
      { parallelism: plan.parallelism }
    );
  }

  const knownStepIds = new Set(blueprintStepIds);
  for (const sl of slices) {
    for (const dep of stepDependencies(sl)) {
      if (!knownStepIds.has(dep) && !slices.some((s) => s.slice_id === dep)) {
        flag(PLAN_DEFECT.UNRESOLVED_DEPENDENCY, `slice \`${sl.slice_id}\` depends on \`${dep}\`, which is neither a blueprint step nor a slice`, {
          slice_id: sl.slice_id,
          dependency: dep,
        });
      }
    }
  }

  if (!cycle) {
    const derivedLevel = new Map();
    waves.forEach((ids, i) => ids.forEach((id) => derivedLevel.set(id, i)));
    for (const declared of plan?.waves || []) {
      for (const sliceId of declared.slice_ids || []) {
        const truth = derivedLevel.get(sliceId);
        if (truth !== undefined && truth > declared.wave_index) {
          flag(
            PLAN_DEFECT.WAVE_ORDER_VIOLATION,
            `slice \`${sliceId}\` is scheduled in wave ${declared.wave_index} but its dependencies only complete by wave ${truth}`,
            { slice_id: sliceId, declared_wave: declared.wave_index, earliest_possible_wave: truth }
          );
        }
      }
    }

    // Parallel write collisions are checked against the DERIVED waves: a plan
    // that mislabels its own waves must not thereby hide a collision.
    waves.forEach((sliceIds, waveIndex) => {
      const owners = new Map();
      for (const sliceId of sliceIds) {
        const sl = slices.find((s) => s.slice_id === sliceId);
        for (const f of sl?.target_files || []) {
          if (!owners.has(f)) owners.set(f, []);
          owners.get(f).push(sliceId);
        }
      }
      for (const [file, ids] of owners) {
        if (ids.length > 1) {
          flag(
            PLAN_DEFECT.PARALLEL_WRITE_COLLISION,
            `slices ${ids.join(', ')} would write \`${file}\` simultaneously in wave ${waveIndex}`,
            { file, wave_index: waveIndex, slices: ids }
          );
        }
      }
    });
  }

  // continue_isolated is only honest when nothing depends on the slice.
  const dependedOn = new Set();
  for (const sl of slices) for (const d of stepDependencies(sl)) dependedOn.add(d);
  for (const sl of slices) {
    if (sl?.failure_disposition !== FAILURE_DISPOSITION.CONTINUE_ISOLATED) continue;
    const hasDependents = (sl.steps || []).some((st) => dependedOn.has(st)) || dependedOn.has(sl.slice_id);
    if (hasDependents) {
      flag(
        PLAN_DEFECT.UNSAFE_CONTINUE_ISOLATED,
        `slice \`${sl.slice_id}\` claims continue_isolated but other work depends on it — continuing would build on a failed foundation`,
        { slice_id: sl.slice_id }
      );
    }
  }

  if (inventionReport && inventionReport.manufacturing_authorized === false) {
    flag(
      PLAN_DEFECT.BLUEPRINT_DEFECTS_OUTSTANDING,
      `${inventionReport.defect_count} unauthorized-decision defect(s) remain in the blueprint — a plan cannot authorize work the blueprint has not specified`,
      { routing: inventionReport.routing }
    );
  }

  // Consensus. Verified, never minted, by the same rule that closed OPEN-7.
  const seals = Array.isArray(plan?.consensus_seals) ? plan.consensus_seals : [];
  const expectedHash = manufacturingPlanHash(plan);
  const seenOffices = new Set();
  for (const seal of seals) {
    const office = String(seal?.office || '').toLowerCase();
    if (!REQUIRED_CONSENSUS_OFFICES.includes(office)) {
      flag(PLAN_DEFECT.UNAUTHORIZED_SEAL_ISSUER, `\`${office || 'unknown'}\` is not an office of the manufacturing consensus`, {
        office,
      });
      continue;
    }
    if (seenOffices.has(office)) {
      flag(PLAN_DEFECT.DUPLICATE_OFFICE_SEAL, `office \`${office}\` sealed twice — one office cannot supply another's consent`, {
        office,
      });
      continue;
    }
    if (seal?.plan_hash !== expectedHash) {
      flag(PLAN_DEFECT.SEAL_PLAN_HASH_MISMATCH, `\`${office}\` sealed different plan bytes — approval does not transfer to an edited plan`, {
        office,
        sealed: seal?.plan_hash,
        actual: expectedHash,
      });
      continue;
    }
    seenOffices.add(office);
  }
  for (const office of REQUIRED_CONSENSUS_OFFICES) {
    if (!seenOffices.has(office)) {
      flag(PLAN_DEFECT.MISSING_CONSENSUS_SEAL, `no valid seal from \`${office}\``, { office });
    }
  }

  const blocking = defects.filter((d) => d.id !== PLAN_DEFECT.MISSING_CONSENSUS_SEAL);
  const consensusComplete = seenOffices.size === REQUIRED_CONSENSUS_OFFICES.length;

  let state = GATE_STATE.DEFECTS_OUTSTANDING;
  if (blocking.length === 0 && consensusComplete) state = GATE_STATE.MANUFACTURING_AUTHORIZED;
  else if (blocking.length === 0) state = GATE_STATE.MANUFACTURING_PLAN_DRAFTED;

  return {
    // Fail closed: authorization requires a positive result, never the absence of
    // an error, and never a truthy default.
    manufacturing_authorized: state === GATE_STATE.MANUFACTURING_AUTHORIZED,
    state,
    plan_hash: expectedHash,
    consensus: {
      required: [...REQUIRED_CONSENSUS_OFFICES],
      obtained: [...seenOffices],
      complete: consensusComplete,
    },
    defect_count: defects.length,
    defects,
    routing: defects.reduce((acc, d) => {
      acc[d.authority] = (acc[d.authority] || 0) + 1;
      return acc;
    }, {}),
    derived_waves: waves,
    checked_at_hash: { blueprint: blueprint ? blueprintHash(blueprint) : null },
  };
}

/** A slice's dependencies expressed in slice space rather than step space. */
function sliceDeps(slice, slices, steps) {
  const owner = new Map();
  for (const sl of slices) for (const st of sl.steps || []) owner.set(st, sl.slice_id);
  const out = new Set();
  for (const dep of stepDependencies(slice)) {
    const mapped = owner.get(dep);
    if (mapped && mapped !== slice.slice_id) out.add(mapped);
    else if (!mapped && slices.some((s) => s.slice_id === dep)) out.add(dep);
  }
  // Steps inside the slice may depend on steps outside it.
  for (const st of slice.steps || []) {
    const step = steps.find((s) => stepId(s) === st);
    for (const dep of stepDependencies(step)) {
      const mapped = owner.get(dep);
      if (mapped && mapped !== slice.slice_id) out.add(mapped);
    }
  }
  return [...out];
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const cmd = process.argv[2];
  const blueprintPath = arg('blueprint');
  const planPath = arg('plan');

  if (!['compile', 'verify'].includes(cmd)) {
    console.error('usage: manufacturing-plan.mjs <compile|verify> --blueprint <path> [--plan <path>] [--out <path>]');
    process.exit(2);
  }
  if (!blueprintPath) {
    console.error('MANUFACTURING_PLAN: --blueprint is required');
    process.exit(2);
  }
  const blueprint = JSON.parse(fs.readFileSync(path.resolve(ROOT, blueprintPath), 'utf8'));

  if (cmd === 'compile') {
    const plan = compileManufacturingPlan(blueprint);
    const out = arg('out');
    if (out) {
      const abs = path.resolve(ROOT, out);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${JSON.stringify(plan, null, 2)}\n`);
    }
    console.log(
      JSON.stringify(
        {
          plan_id: plan.plan_id,
          slices: plan.slices.length,
          waves: plan.waves.length,
          integration_points: plan.integration_points.length,
          collision_risks: plan.collision_risks.length,
          plan_hash: plan.plan_hash,
          written: out || null,
          note: 'A compiled plan is a PROPOSAL. It is not authorized until all three offices seal it.',
        },
        null,
        2
      )
    );
    return;
  }

  if (!planPath) {
    console.error('MANUFACTURING_PLAN: verify needs --plan <path>');
    process.exit(2);
  }
  const plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, planPath), 'utf8'));
  const result = verifyManufacturingPlan(plan, blueprint);
  console.log(JSON.stringify(result, null, 2));
  if (!result.manufacturing_authorized) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('manufacturing-plan.mjs')) {
  main();
}

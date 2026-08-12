#!/usr/bin/env node
/**
 * SYNOPSIS: Topology truth for manufacturing plans — strongly connected
 * components, honest wave scheduling, makespan-first dispatch order, parallelism
 * metrics, and a source-coverage invariant.
 *
 * Written after a blueprint marked `ready_to_execute: true` was found to contain
 * a real dependency cycle (012 → 014 → 013 → 012, with 015 knotted in), which
 * made five of sixteen steps topologically impossible. Chair: planning truth and
 * executable truth had diverged, and nothing in the pipeline was obliged to
 * notice.
 *
 * Two design commitments follow from how that was nearly missed:
 *
 * 1. Find EVERY cycle, not the first one. A validator that returns one cycle and
 *    an empty schedule reports a graph as unschedulable without saying how much
 *    of it is fine, which is indistinguishable from a validator bug — the exact
 *    ambiguity that cost a round of investigation here.
 *
 * 2. Account for every source step exactly once. A wave-by-wave report silently
 *    omitted the five knotted steps and described a tidy eleven-step build. If
 *    sixteen steps enter planning, sixteen must appear in the report.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** Disposition of every source step. Closed set: the coverage invariant counts these. */
export const STEP_DISPOSITION = Object.freeze({
  SCHEDULED: 'scheduled',
  BLOCKED: 'blocked',
  CYCLIC: 'cyclic',
  REJECTED: 'rejected',
});

/**
 * Where a blocker comes from. Without this, a blueprint that cannot execute at
 * all looks the same as slow factories, and the factories get blamed.
 */
export const BLOCKER_ORIGIN = Object.freeze({
  FOUNDER_DECISION: 'founder_decision',
  ARCHITECTURE: 'architecture',
  MANUFACTURING_PLAN: 'manufacturing_plan',
  ENVIRONMENT: 'environment',
  TOOLING: 'tooling',
  BUILDER_EXECUTION: 'builder_execution',
});

/**
 * Tarjan. Returns every strongly connected component, including single nodes, so
 * callers can distinguish "one node, no self-loop" (fine) from a real knot.
 */
export function stronglyConnectedComponents(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  const strongConnect = (id) => {
    index.set(id, counter);
    low.set(id, counter);
    counter += 1;
    stack.push(id);
    onStack.add(id);

    for (const dep of byId.get(id)?.depends_on || []) {
      if (!byId.has(dep)) continue;
      if (!index.has(dep)) {
        strongConnect(dep);
        low.set(id, Math.min(low.get(id), low.get(dep)));
      } else if (onStack.has(dep)) {
        low.set(id, Math.min(low.get(id), index.get(dep)));
      }
    }

    if (low.get(id) === index.get(id)) {
      const component = [];
      for (;;) {
        const w = stack.pop();
        onStack.delete(w);
        component.push(w);
        if (w === id) break;
      }
      components.push(component.sort());
    }
  };

  for (const n of nodes) if (!index.has(n.id)) strongConnect(n.id);
  return components;
}

/** A knot is a component with more than one member, or a node depending on itself. */
export function findCycles(nodes) {
  const selfLoops = nodes.filter((n) => (n.depends_on || []).includes(n.id)).map((n) => [n.id]);
  const multi = stronglyConnectedComponents(nodes).filter((c) => c.length > 1);
  return [...multi, ...selfLoops];
}

/**
 * Longest chain from a node to any sink. This is dispatch priority: a slice that
 * feeds a long chain must start first even if a shorter independent slice looks
 * cheaper, because the objective is finishing everything (makespan), not keeping
 * both lanes busy (utilization).
 */
export function criticalPathDepth(nodes) {
  const dependents = new Map(nodes.map((n) => [n.id, []]));
  for (const n of nodes) {
    for (const d of n.depends_on || []) if (dependents.has(d)) dependents.get(d).push(n.id);
  }
  const depth = new Map();
  const cyclic = new Set(findCycles(nodes).flat());
  const walk = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    let max = 0;
    for (const child of dependents.get(id) || []) max = Math.max(max, walk(child, seen) + 1);
    if (!cyclic.has(id)) depth.set(id, max);
    return max;
  };
  for (const n of nodes) walk(n.id);
  return depth;
}

/**
 * Kahn's algorithm, stopped honestly, with makespan-first ordering inside each
 * wave. Whatever still has unmet dependencies when progress stops is named
 * rather than dropped.
 */
export function scheduleWaves(nodes) {
  const remaining = new Map(nodes.map((n) => [n.id, new Set((n.depends_on || []).filter((d) => nodes.some((x) => x.id === d)))]));
  const priority = criticalPathDepth(nodes);
  const done = new Set();
  const waves = [];

  for (;;) {
    const ready = [...remaining.entries()]
      .filter(([, deps]) => [...deps].every((d) => done.has(d)))
      .map(([id]) => id)
      .sort((a, b) => (priority.get(b) ?? 0) - (priority.get(a) ?? 0) || String(a).localeCompare(String(b)));
    if (ready.length === 0) break;
    waves.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      done.add(id);
    }
  }
  return { waves, unschedulable: [...remaining.keys()].sort() };
}

/**
 * Parallelism, reported before work begins so factory count can never be used as
 * a vanity metric. Units are steps, not minutes: this measures the shape of the
 * graph, not how long a step takes.
 */
export function parallelismMetrics(waves, laneCount) {
  const scheduled = waves.flat().length;
  const criticalPathFloor = waves.length;
  const maxTheoretical = waves.length ? Math.max(...waves.map((w) => w.length)) : 0;
  const makespan = waves.reduce((n, w) => n + Math.ceil(w.length / Math.max(1, laneCount)), 0);
  const speedup = makespan > 0 ? scheduled / makespan : 0;
  return {
    lane_count: laneCount,
    scheduled_steps: scheduled,
    unit: 'steps (graph shape, not elapsed time)',
    max_theoretical_parallelism: maxTheoretical,
    critical_path_floor: criticalPathFloor,
    single_lane_units: scheduled,
    expected_makespan_units: makespan,
    effective_parallelism: Number(speedup.toFixed(3)),
    expected_speedup_x: Number(speedup.toFixed(2)),
    lane_utilization: makespan > 0 ? Number((scheduled / (makespan * Math.max(1, laneCount))).toFixed(3)) : 0,
    floor_reason:
      criticalPathFloor >= makespan
        ? 'At the floor: the dependency chain, not lane count, sets the duration. More builders cannot help.'
        : 'Below the floor is impossible; additional lanes would still be limited by the critical path.',
  };
}

/**
 * The invariant that would have caught the tidy eleven-step document instantly:
 * every source step lands in exactly one disposition, and the totals must match.
 */
export function accountForSteps({ sourceStepIds, scheduled = [], blocked = [], cyclic = [], rejected = [] }) {
  const buckets = {
    [STEP_DISPOSITION.SCHEDULED]: new Set(scheduled),
    [STEP_DISPOSITION.BLOCKED]: new Set(blocked),
    [STEP_DISPOSITION.CYCLIC]: new Set(cyclic),
    [STEP_DISPOSITION.REJECTED]: new Set(rejected),
  };
  const counts = {};
  const placement = new Map();
  for (const [name, set] of Object.entries(buckets)) {
    counts[name] = set.size;
    for (const id of set) placement.set(id, [...(placement.get(id) || []), name]);
  }

  const unaccounted = sourceStepIds.filter((id) => !placement.has(id));
  const doubleCounted = [...placement.entries()].filter(([, names]) => names.length > 1).map(([id, names]) => ({ step_id: id, dispositions: names }));
  const unknown = [...placement.keys()].filter((id) => !sourceStepIds.includes(id));

  return {
    source_step_count: sourceStepIds.length,
    accounted_count: placement.size,
    counts,
    unaccounted_steps: unaccounted,
    double_counted_steps: doubleCounted,
    steps_not_in_source: unknown,
    complete:
      unaccounted.length === 0 &&
      doubleCounted.length === 0 &&
      unknown.length === 0 &&
      placement.size === sourceStepIds.length,
  };
}

/**
 * Full topology verdict from a frozen source graph. A cycle is only lawful if it
 * is declared AND carries an iterative execution contract — otherwise a builder
 * would be handed work that cannot start, which is how this class of failure
 * reached the founder in the first place.
 */
export function topologyReport(nodes, { declaredCycles = [], laneCount = 1 } = {}) {
  const cycles = findCycles(nodes);
  const declared = declaredCycles.map((d) => ({
    members: [...(d.members || [])].sort(),
    has_contract: Boolean(d.iterative_execution_contract),
  }));

  const cycleFindings = cycles.map((members) => {
    const match = declared.find((d) => d.members.length === members.length && d.members.every((m, i) => m === members[i]));
    return {
      members,
      declared: Boolean(match),
      has_iterative_execution_contract: Boolean(match?.has_contract),
      lawful: Boolean(match?.has_contract),
    };
  });

  const { waves, unschedulable } = scheduleWaves(nodes);
  return {
    node_count: nodes.length,
    cycles: cycleFindings,
    unlawful_cycles: cycleFindings.filter((c) => !c.lawful),
    waves,
    unschedulable_steps: unschedulable,
    parallelism: parallelismMetrics(waves, laneCount),
    acyclic: cycleFindings.length === 0,
  };
}

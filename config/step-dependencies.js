/**
 * SYNOPSIS: Canonical step-dependency contract. Three different key names for
 * the same concept are live in the repo and each subsystem is internally
 * consistent while disagreeing across the boundary:
 *
 *   step.deps         — services/intake-blueprint-executor.js, run-arc-entry-gate,
 *                       run-arc-pipeline (intake/ARC lane)
 *   step.depends_on   — services/build-queue-planner.js, product-build-orchestrator,
 *                       build-queue-step-adapter, build-queue-drift-repair,
 *                       goal-decomposition (manufacturing queue lane)
 *   step.dependencies — factory-staging/.../run-mission.js,
 *                       scripts/verify-blueprint-authority.mjs (mission lane)
 *
 * The failure this prevents is silent and severe: a step authored with `deps`
 * and scheduled by the queue (which reads `depends_on`) resolves to ZERO
 * dependencies, so it builds in the wrong order and nothing reports an error.
 * That is the same class as the dormant-enforcement defect — a mechanism that
 * appears to work because its input is invisibly empty.
 *
 * `depends_on` is canonical because the manufacturing queue is the subsystem the
 * authorized dependency graph must be executed by. The other two are permanent
 * accepted aliases on read: rewriting 4000+ historical blueprint artifacts to
 * change a key name would be a large, risky, zero-behavior-gain migration.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const CANONICAL_DEP_KEY = 'depends_on';

/** Every key that has ever meant "this step's dependencies", canonical first. */
export const DEP_KEY_ALIASES = ['depends_on', 'deps', 'dependencies'];

function asIdArray(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((v) => (typeof v === 'string' ? v : v?.id ?? v?.step_id ?? null))
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

/**
 * Read a step's dependencies regardless of which key the author used.
 * Union rather than first-match: if a step carries two keys, honoring only one
 * would drop real edges from the graph, and dropping an edge is what lets work
 * run before its prerequisite.
 */
export function stepDependencies(step) {
  if (!step || typeof step !== 'object') return [];
  const out = [];
  const added = new Set();
  for (const key of DEP_KEY_ALIASES) {
    for (const id of asIdArray(step[key])) {
      if (!added.has(id)) {
        added.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/**
 * True when a step carries more than one dependency key with DIFFERENT contents.
 * That is a genuine authoring contradiction: two subsystems reading the same
 * step would build different graphs from it, so it must be reported rather than
 * silently unioned into a plausible-looking answer.
 */
export function hasContradictoryDependencyKeys(step) {
  if (!step || typeof step !== 'object') return false;
  const present = DEP_KEY_ALIASES.filter((k) => step[k] !== undefined && step[k] !== null).map((k) => ({
    key: k,
    ids: asIdArray(step[k]).slice().sort().join(','),
  }));
  if (present.length < 2) return false;
  return new Set(present.map((p) => p.ids)).size > 1;
}

/**
 * Return a copy of the step with the canonical key populated, preserving the
 * original alias keys so existing readers keep working during migration.
 */
export function withCanonicalDependencies(step) {
  if (!step || typeof step !== 'object') return step;
  return { ...step, [CANONICAL_DEP_KEY]: stepDependencies(step) };
}

/** Steps whose dependency keys disagree — for gates and audits. */
export function findDependencyKeyContradictions(steps = []) {
  return (Array.isArray(steps) ? steps : [])
    .filter((s) => hasContradictoryDependencyKeys(s))
    .map((s) => ({
      step_id: s.id || s.step_id || null,
      keys: DEP_KEY_ALIASES.filter((k) => s[k] !== undefined && s[k] !== null).reduce((acc, k) => {
        acc[k] = asIdArray(s[k]);
        return acc;
      }, {}),
      detail:
        'step declares more than one dependency key with different contents — two subsystems would build different graphs from it',
    }));
}

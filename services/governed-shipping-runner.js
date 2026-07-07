/**
 * SYNOPSIS: STEP 5b — the governed shipping runner. Walks a build queue and ships
 * every step THROUGH the governed pipe (POST /factory/execute-step: BPB → Builder
 * → SENTRY → TSOS → Historian) instead of the legacy ungoverned /build. This is
 * the replacement shipping path the STEP 5a fence (GOVERNED_FACTORY_ONLY) gates
 * on: once this is proven live, flipping the flag retires the ungoverned loop with
 * no loss of build throughput.
 *
 * Assertion provenance stays clean: BPB authors each step's behavior_assertions
 * from the blueprint spec (author-assertions.js), never codegen (STEP 4 lock).
 *
 * CENTURY'S FLAG (live council SHA 1783452556804): the runner's own dispatch loop
 * is ungoverned code — a crash mid-mission must NOT leave silent partial state.
 * So every step is checkpointed durably BEFORE and AFTER dispatch, a crash emits
 * an explicit governed signal (never a silent skip), and the run is RESUMABLE from
 * the last completed step. Fail-closed: a step whose spec declares no provable
 * behavior halts the run (does not ship) rather than shipping unprovable code.
 *
 * factory-core stays pure — dispatch / checkpoint / signal are injected here at
 * the services boundary.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { attachAuthoredAssertions } from '../factory-staging/factory-core/bpb/author-assertions.js';

const noop = () => {};

/**
 * @param {object} opts
 * @param {Array} opts.steps            governed build steps (in order)
 * @param {string} opts.mission_id
 * @param {string} opts.blueprint_id
 * @param {Function} opts.dispatch      async ({ mission_id, blueprint_id, step }) -> { httpStatus, body }
 *                                       (injected: wraps dispatchExecuteStep / POST /factory/execute-step)
 * @param {Function} [opts.checkpoint]  async ({ index, step_id, phase, result }) -> void  (durable progress)
 * @param {Function} [opts.signal]      async ({ kind, ... }) -> void  (founder-visible / Historian signal)
 * @param {number}  [opts.startIndex]   resume from this step index (governed recovery)
 */
export async function runGovernedShippingQueue({
  steps, mission_id, blueprint_id, dispatch, checkpoint = noop, signal = noop, startIndex = 0,
}) {
  if (!Array.isArray(steps)) throw new Error('runGovernedShippingQueue requires steps[]');
  if (typeof dispatch !== 'function') throw new Error('runGovernedShippingQueue requires an injected dispatch fn');

  const shipped = [];
  const summary = { mission_id, blueprint_id, total: steps.length, shipped: 0, resumed_from: startIndex };

  for (let i = startIndex; i < steps.length; i += 1) {
    const rawStep = steps[i];
    const step_id = rawStep?.step_id || `step-${i}`;

    // BPB authors assertions from the spec (provenance-clean). Fail-closed: if the
    // blueprint declared nothing provable for a server-code target, we HALT — we
    // never ship code SENTRY cannot independently prove.
    const authored = attachAuthoredAssertions(rawStep);
    if (!authored.ok) {
      await signal({ kind: 'halted_unprovable_step', mission_id, blueprint_id, step_id, index: i, reason: authored.reason });
      return { ok: false, halted: true, reason: authored.reason, step_id, index: i, ...summary, shipped };
    }

    const step = { ...authored.step, action_type: authored.step.action_type || 'author_then_write' };
    await checkpoint({ index: i, step_id, phase: 'dispatching', assertion_provenance: authored.provenance });

    let result;
    try {
      result = await dispatch({ mission_id, blueprint_id, step });
    } catch (err) {
      // CENTURY'S FLAG: crash is loud + resumable, never a silent skip.
      await signal({ kind: 'runner_crash', mission_id, blueprint_id, step_id, index: i, error: String(err?.message || err), resume_from: i });
      return { ok: false, crashed: true, error: String(err?.message || err), step_id, index: i, resume_from: i, ...summary, shipped };
    }

    const passed = result?.httpStatus === 200 && result?.body?.sentry?.implementation_status === 'PASS';
    await checkpoint({ index: i, step_id, phase: passed ? 'shipped' : 'blocked', httpStatus: result?.httpStatus, result });

    if (!passed) {
      // SENTRY/pipe refused it — governed block, surfaced, run stops (fail-closed).
      await signal({ kind: 'step_blocked_by_governance', mission_id, blueprint_id, step_id, index: i, httpStatus: result?.httpStatus, gap_type: result?.body?.gap_type, sentry: result?.body?.sentry?.implementation_status, resume_from: i });
      return { ok: false, blocked: true, step_id, index: i, httpStatus: result?.httpStatus, resume_from: i, ...summary, shipped };
    }

    shipped.push({ step_id, index: i, assertion_provenance: authored.provenance, codegen: result?.body?.codegen || null });
    summary.shipped = shipped.length;
  }

  await signal({ kind: 'queue_complete', mission_id, blueprint_id, shipped: summary.shipped, total: summary.total });
  return { ok: true, complete: true, ...summary, shipped };
}

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
import { blueprintFollowClaim, dualHonestyGrade, exactChangeClaim } from './truth-ladder.js';

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
  claim_following_blueprint = true,
}) {
  if (!Array.isArray(steps)) throw new Error('runGovernedShippingQueue requires steps[]');
  if (typeof dispatch !== 'function') throw new Error('runGovernedShippingQueue requires an injected dispatch fn');

  const shipped = [];
  const honesty_grades = [];
  const summary = {
    mission_id,
    blueprint_id,
    total: steps.length,
    shipped: 0,
    resumed_from: startIndex,
    claim_following_blueprint: claim_following_blueprint !== false,
  };

  for (let i = startIndex; i < steps.length; i += 1) {
    const rawStep = steps[i];
    const step_id = rawStep?.step_id || `step-${i}`;
    const twin = blueprintFollowClaim({
      blueprint_id: blueprint_id || rawStep?.blueprint_id,
      blueprint_step_id: rawStep?.blueprint_step_id || step_id,
      claim_following_blueprint: claim_following_blueprint !== false,
    });
    if (!twin.ok) {
      await signal({
        kind: 'not_on_blueprint',
        mission_id,
        blueprint_id,
        step_id,
        index: i,
        status: twin.status,
        error: twin.error,
      });
      return {
        ok: false,
        status: 'NOT_ON_BLUEPRINT',
        halted: true,
        reason: twin.error,
        step_id,
        index: i,
        ...summary,
        shipped,
        honesty_grades,
      };
    }

    const exact = exactChangeClaim({
      blueprint_id: twin.blueprint_id,
      blueprint_step_id: twin.blueprint_step_id,
      claim_following_blueprint: claim_following_blueprint !== false,
    });
    if (!exact.ok) {
      await signal({
        kind: 'not_exact_blueprint_step',
        mission_id,
        blueprint_id: twin.blueprint_id,
        step_id,
        blueprint_step_id: twin.blueprint_step_id,
        index: i,
        status: exact.status,
        error: exact.error,
      });
      return {
        ok: false,
        status: exact.status || 'NOT_EXACT_BLUEPRINT_STEP',
        halted: true,
        reason: exact.error,
        step_id,
        index: i,
        ...summary,
        shipped,
        honesty_grades,
      };
    }

    // BPB authors assertions from the spec (provenance-clean). Fail-closed: if the
    // blueprint declared nothing provable for a server-code target, we HALT — we
    // never ship code SENTRY cannot independently prove.
    const authored = attachAuthoredAssertions({
      ...rawStep,
      target_file: exact.target_file || rawStep?.target_file,
    });
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

    // Dual honesty: Factory self-grades; SENTRY is the peer (separation of powers).
    // Trust is not earned by self-certify alone — compare + receipts.
    const commitSha = result?.body?.commit_sha || result?.body?.codegen?.commit_sha || null;
    const honesty = await dualHonestyGrade({
      actor_id: 'factory_cdr',
      claim: passed ? `shipped ${step_id} on blueprint` : `failed ${step_id}`,
      self_grade: passed ? 'KNOW' : 'GUESS',
      self_rationale: passed ? 'factory_dispatch_ok' : 'factory_blocked',
      kind: 'deploy',
      evidence: {
        test_result: passed ? 'pass' : 'fail',
        ...(commitSha ? { commit_sha: commitSha } : {}),
        ...(passed ? { deploy_verified: Boolean(commitSha) } : {}),
      },
    }, {
      peerReviewFn: async () => ({
        grade: passed ? (commitSha ? 'KNOW' : 'THINK') : 'GUESS',
        rationale: passed
          ? (commitSha ? 'sentry_PASS+commit_sha' : 'sentry_PASS_no_sha')
          : `sentry_${result?.body?.sentry?.implementation_status || 'FAIL'}`,
        theater_detected: !passed,
      }),
    });
    honesty_grades.push({ step_id, index: i, ...honesty });
    await signal({
      kind: 'dual_honesty_grade',
      mission_id,
      blueprint_id: twin.blueprint_id,
      blueprint_step_id: twin.blueprint_step_id,
      step_id,
      index: i,
      honesty,
    });

    if (!passed) {
      // SENTRY/pipe refused it — governed block, surfaced, run stops (fail-closed).
      await signal({ kind: 'step_blocked_by_governance', mission_id, blueprint_id, step_id, index: i, httpStatus: result?.httpStatus, gap_type: result?.body?.gap_type, sentry: result?.body?.sentry?.implementation_status, resume_from: i });
      return {
        ok: false,
        blocked: true,
        step_id,
        index: i,
        httpStatus: result?.httpStatus,
        body: result?.body,
        resume_from: i,
        ...summary,
        shipped,
        honesty_grades,
      };
    }

    shipped.push({
      step_id,
      blueprint_step_id: twin.blueprint_step_id,
      index: i,
      assertion_provenance: authored.provenance,
      codegen: result?.body?.codegen || null,
      trust_earned: honesty.trust_earned,
      honesty: honesty.compare,
    });
    summary.shipped = shipped.length;
  }

  await signal({ kind: 'queue_complete', mission_id, blueprint_id, shipped: summary.shipped, total: summary.total });
  return { ok: true, complete: true, ...summary, shipped, honesty_grades };
}
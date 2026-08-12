#!/usr/bin/env node
/**
 * SYNOPSIS: Deterministic slice→factory allocation over an authorized manufacturing
 * plan, plus the redundancy and challenge mechanics for two or more factories.
 *
 * Allocation is deliberately NOT a model call. Given the same plan, registry and
 * capability profiles it returns the same assignment, so an allocation can be
 * audited and reproduced rather than argued about.
 *
 * Two things this must never do, both drawn directly from the founder's framing:
 *  - allocate two factories to the same file in the same wave (that is the git-lock
 *    and staging-contamination failure already observed live);
 *  - resolve a disagreement by voting. Disagreement is information; it routes to
 *    the Consensus Protocol, where each side defends the other's solution and
 *    attacks its own.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALLOCATION_MODE,
  HIGH_RISK_MARKERS,
  ISOLATION_RULES,
  FACTORY_HIERARCHY,
  isKnownFactory,
  activeFactories,
} from '../config/factory-registry.js';

import { BLOCKER_ORIGIN } from './plan-topology.mjs';
import { effectiveIndependence, isCorrelated } from '../config/independence-factors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEALTH_RECEIPT = path.join(ROOT, 'products/receipts/FACTORY_HEALTH_RECEIPT.json');

/**
 * The planner passes factory id strings. Tests pass `{ factory_id }` objects.
 * FACTORIES in the registry have no `status` field (capacity is observed), so
 * `FACTORIES.filter(f => f.status === 'active')` was always empty — every live
 * two-factory plan printed `unassigned` / `→  +`.
 */
export function normalizeFactories(factories) {
  const list = Array.isArray(factories) ? factories : [];
  return list
    .map((f) => {
      if (typeof f === 'string' && f.trim()) return { factory_id: f.trim() };
      if (f && typeof f === 'object' && f.factory_id) return f;
      return null;
    })
    .filter(Boolean);
}

/** A slice is high risk when what it touches is expensive to get wrong. */
export function sliceRiskClass(slice) {
  const text = JSON.stringify(slice || {}).toLowerCase();
  const hits = HIGH_RISK_MARKERS.filter((m) => text.includes(m));
  return { high_risk: hits.length > 0, markers: hits };
}

/**
 * Pick the factory with the strongest record on the dimension this slice needs.
 * Falls back to round-robin when there is no evidence — an empty ledger must not
 * silently become a preference, and pretending to have a reason is worse than
 * admitting there isn't one yet.
 */
function chooseByCapability(slice, factories, profiles, index) {
  const risk = sliceRiskClass(slice);
  const dimension = risk.high_risk ? 'reality_performance' : 'blueprint_fidelity';
  const scored = factories
    .map((f) => {
      const p = profiles.find((x) => x.factory_id === f.factory_id);
      const value = p?.dimensions?.[dimension];
      const disqualified = p?.trustworthiness?.disqualified_for_high_stakes === true;
      return { factory: f, value: typeof value === 'number' ? value : null, disqualified };
    })
    .filter((s) => !(risk.high_risk && s.disqualified));
  const eligible = scored.length > 0 ? scored : factories.map((f) => ({ factory: f, value: null }));
  const withEvidence = eligible.filter((s) => s.value !== null);
  if (withEvidence.length === 0) {
    return {
      factory_id: eligible[index % eligible.length].factory.factory_id,
      basis: 'round_robin_no_evidence_yet',
      dimension,
    };
  }
  withEvidence.sort((a, b) => b.value - a.value);
  return {
    factory_id: withEvidence[0].factory.factory_id,
    basis: `empirical_${dimension}=${withEvidence[0].value}`,
    dimension,
  };
}

/**
 * Allocate every slice in an authorized plan.
 * `mode` selects how extra capacity is spent; high-risk slices are upgraded to
 * redundant independent work automatically when more than one factory is available.
 */
/**
 * Reads the last health audit. Deliberately reads evidence from disk rather than
 * accepting a caller's assertion of health: the lane under test cannot be the
 * witness to its own fitness.
 */
export const HEALTH_PROOF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function loadHealthProofs(receiptPath = HEALTH_RECEIPT, { now = Date.now() } = {}) {
  try {
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    const proofs = {};
    for (const f of receipt.factories || []) {
      const checkedAt = f.checked_at || receipt.generated_at;
      // A lane proves itself when it comes online, not once in its lifetime. An
      // expired proof is treated as no proof: the workspace may have changed in
      // any way since, including losing the dependencies it needs to verify work.
      const stale = checkedAt ? now - Date.parse(checkedAt) > HEALTH_PROOF_MAX_AGE_MS : true;
      proofs[f.factory_id] = {
        verdict: stale ? 'STALE_PROOF' : f.verdict,
        checked_at: checkedAt,
        failed_checks: stale
          ? [`health proof is older than ${HEALTH_PROOF_MAX_AGE_MS / 3600000}h — re-run the audit`]
          : (f.checks || []).filter((c) => !c.healthy).map((c) => c.check),
      };
    }
    return proofs;
  } catch {
    return {};
  }
}

export function allocate(plan, {
  factories = activeFactories(),
  profiles = [],
  mode = ALLOCATION_MODE.PARALLEL_SPLIT,
  redundancy_for_high_risk = true,
  healthProofs = loadHealthProofs(),
  ownerFor = null,
} = {}) {
  const factoryList = normalizeFactories(factories);
  const slices = Array.isArray(plan?.slices) ? plan.slices : [];
  const assignments = [];
  const violations = [];

  slices.forEach((slice, i) => {
    const risk = sliceRiskClass(slice);
    const file = slice.target_files?.[0] || slice.target || '';
    if (typeof ownerFor === 'function') {
      const owner = ownerFor(file);
      assignments.push({
        slice_id: slice.slice_id,
        mode: ALLOCATION_MODE.PARALLEL_SPLIT,
        factory_ids: [owner],
        risk,
        basis: 'lane_assignment',
      });
      return;
    }
    const wantsRedundancy =
      mode === ALLOCATION_MODE.REDUNDANT_INDEPENDENT ||
      (redundancy_for_high_risk && risk.high_risk && factoryList.length > 1);

    if (wantsRedundancy && factoryList.length > 1) {
      assignments.push({
        slice_id: slice.slice_id,
        mode: ALLOCATION_MODE.REDUNDANT_INDEPENDENT,
        factory_ids: factoryList.map((f) => f.factory_id),
        risk,
        // Both build the same thing without seeing each other's answer. The point
        // is independent cognition; showing the work early destroys it.
        isolation: 'neither factory sees the peer result before submitting its own',
        comparison_required: true,
        basis: risk.high_risk ? `high_risk:${risk.markers.join(',')}` : 'explicit_redundant_mode',
      });
      return;
    }

    const chosen = chooseByCapability(slice, factoryList, profiles, i);
    assignments.push({
      slice_id: slice.slice_id,
      mode: ALLOCATION_MODE.PARALLEL_SPLIT,
      factory_ids: [chosen.factory_id],
      risk,
      basis: chosen.basis,
    });
  });

  // No two factories may write the same file inside one wave.
  for (const wave of plan?.waves || []) {
    const owners = new Map();
    for (const sliceId of wave.slice_ids || []) {
      const slice = slices.find((s) => s.slice_id === sliceId);
      const assignment = assignments.find((a) => a.slice_id === sliceId);
      for (const file of slice?.target_files || []) {
        if (!owners.has(file)) owners.set(file, new Set());
        for (const f of assignment?.factory_ids || []) owners.get(file).add(f);
      }
    }
    for (const [file, set] of owners) {
      if (set.size > 1) {
        violations.push({
          id: 'CONCURRENT_FACTORY_WRITE',
          wave_index: wave.wave_index,
          file,
          factories: [...set],
          detail: 'two factories would write one file in the same wave — the git-lock and staging-contamination failure already observed live',
        });
      }
    }
  }

  for (const a of assignments) {
    for (const id of a.factory_ids) {
      if (!isKnownFactory(id)) {
        violations.push({ id: 'UNKNOWN_FACTORY', slice_id: a.slice_id, factory_id: id, detail: 'work assigned to an unregistered factory identity' });
      }
    }
  }

  // Health is a precondition for receiving work, not a property of being
  // registered. factory-2 existed, held a branch, and would have accepted an
  // assignment while being unable to run a single test — the "looks operational"
  // state this gate exists to kill. Fail closed: no proof means not healthy.
  for (const a of assignments) {
    for (const id of a.factory_ids) {
      const proof = healthProofs?.[id];
      if (!proof || proof.verdict !== 'HEALTHY') {
        violations.push({
          id: 'UNHEALTHY_FACTORY_ASSIGNED',
          slice_id: a.slice_id,
          factory_id: id,
          detail: proof
            ? `factory \`${id}\` last proved ${proof.verdict}: ${(proof.failed_checks || []).join(', ') || 'no passing proof'}`
            : `factory \`${id}\` has no health proof — a lane must prove it can mutate its own workspace, run its own verification, and fail to touch a peer before it may be given work`,
          origin: BLOCKER_ORIGIN.ENVIRONMENT,
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    plan_id: plan?.plan_id ?? null,
    factories: factoryList.map((f) => f.factory_id),
    hierarchy: FACTORY_HIERARCHY.model,
    assignments,
    redundant_slices: assignments.filter((a) => a.mode === ALLOCATION_MODE.REDUNDANT_INDEPENDENT).map((a) => a.slice_id),
    violations,
  };
}

/**
 * Compare independent results for a redundantly-built slice.
 *
 * Convergence raises confidence. Divergence is NOT settled by vote — the founder
 * was explicit: "Don't immediately vote." It routes to the Consensus Protocol,
 * where each side defends the peer's solution and attacks its own, and Reality
 * decides wherever it can be tested.
 */
export function compareRedundantResults({ slice_id, results = [] }) {
  const fingerprints = results.map((r) => ({
    factory_id: r.factory_id,
    fingerprint: r.output_hash || JSON.stringify(r.output ?? null),
  }));
  const distinct = new Set(fingerprints.map((f) => f.fingerprint));

  // Independence before consensus. A result produced after seeing the peer is not
  // a second opinion, it is an echo — and an echo that agrees is the most
  // convincing worthless evidence available.
  const contaminated = results.filter((r) => r.saw_peer_before_sealing === true || (r.sealed_at && r.peer_revealed_at && r.sealed_at > r.peer_revealed_at));
  if (contaminated.length > 0) {
    return {
      slice_id,
      converged: null,
      confidence: 'void',
      next_action: 'rerun_with_sealed_independence',
      detail: `${contaminated.map((r) => r.factory_id).join(', ')} saw a peer result before sealing its own; agreement produced this way carries no information`,
      required_order: ['freeze evidence', 'independent analysis', 'seal', 'reveal', 'disagreement analysis', 'consensus'],
    };
  }

  const independence = effectiveIndependence(
    results.map((r) => ({ id: r.factory_id, ...(r.independence_profile || {}) }))
  );

  if (distinct.size <= 1) {
    // Agreement is evidence only to the extent the agreers could have failed
    // separately. Two lanes sharing a dependency tree, a test suite and a model
    // lineage produce one result twice.
    if (isCorrelated(independence)) {
      return {
        slice_id,
        converged: true,
        confidence: 'not_raised_correlated_failure_risk',
        next_action: 'seek_independent_verification',
        effective_perspectives: independence.effective_perspectives,
        shared_factors: independence.shared_factors,
        detail: `${results.length} factories agree, but only ${independence.effective_perspectives} effective perspective(s): they share ${independence.shared_factors.join(', ') || 'unknown factors'}. A defect in anything shared is reproduced identically by both, so agreement about it proves nothing.`,
      };
    }
    return {
      slice_id,
      converged: true,
      confidence: 'raised',
      next_action: 'accept',
      effective_perspectives: independence.effective_perspectives,
      detail: `${results.length} factories independently produced the same result across ${independence.effective_perspectives} effective perspectives`,
    };
  }
  return {
    slice_id,
    converged: false,
    confidence: 'lowered',
    next_action: 'consensus_protocol',
    forbidden_action: 'majority_vote',
    protocol: [
      'each factory defends the peer solution',
      'each factory attacks its own solution',
      'each factory states its assumptions explicitly',
      'seek a third solution neither proposed',
      'test against Reality wherever a test exists',
    ],
    detail: `${distinct.size} distinct results — disagreement is information about the problem, not a tie to break`,
    positions: fingerprints,
  };
}

/**
 * One factory raising a finding against a peer's output. This is the "hold each
 * other capable" mechanism, and it is read-only by construction: a challenge
 * creates a new record for adjudication and never edits the peer's history.
 */
export function raisePeerChallenge({ challenger, subject, slice_id, claim, evidence }) {
  if (!isKnownFactory(challenger) || !isKnownFactory(subject)) {
    return { accepted: false, reason: 'unknown_factory_identity' };
  }
  if (challenger === subject) {
    return { accepted: false, reason: 'self_challenge_is_self_detection_not_peer_review' };
  }
  if (!claim || !evidence) {
    // A flag without substance is noise, and noise is how a challenge mechanism
    // becomes a weapon rather than a safeguard.
    return { accepted: false, reason: 'challenge_requires_claim_and_evidence' };
  }
  return {
    accepted: true,
    record: {
      schema: 'peer_challenge_v1',
      challenger,
      subject,
      slice_id,
      claim,
      evidence,
      status: 'awaiting_adjudication',
      writes_to_peer_record: false,
      adjudication_rule:
        'if Reality confirms the challenger, the challenger earns peer_detection trust and the subject learns a capability weakness — the subject is not punished for an honest error',
    },
    isolation_respected: ISOLATION_RULES.may_write_peer_record === false,
  };
}

function main() {
  const planRel = process.argv[process.argv.indexOf('--plan') + 1];
  if (!planRel || planRel.startsWith('--')) {
    console.error('usage: factory-allocation.mjs --plan <path.json> [--mode parallel_split|redundant_independent]');
    process.exit(2);
  }
  const plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, planRel), 'utf8'));
  const modeArg = process.argv.indexOf('--mode');
  const mode = modeArg > -1 ? process.argv[modeArg + 1] : ALLOCATION_MODE.PARALLEL_SPLIT;
  console.log(JSON.stringify(allocate(plan, { mode }), null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('factory-allocation.mjs')) {
  main();
}

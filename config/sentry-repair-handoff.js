/**
 * SYNOPSIS: SENTRY → Conductor repair handoff. SENTRY must solve what it
 * finds, then send it to the Conductor. Simple issues travel as a finished
 * conclusion (issue + solution) so two agents do not re-work the obvious.
 * Complicated issues withhold SENTRY's solution; the Conductor sees only the
 * problem, produces its own repair, then the two are compared for consensus.
 * Breaking issues bring in more officers.
 *
 * Founder (2026-08-12): "Any issues it finds, it also has to solve those
 * problems. … if it's pretty simple, it sends what the issue was and what
 * the solution is. If it's more complicated … it withholds its solution …
 * then they compare their solutions and get a consensus. If it's larger …
 * something's breaking, then we may wanna bring in more officers."
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const REPAIR_LANE = Object.freeze({
  SEND_CONCLUSION: 'send_conclusion',
  DUAL_SOLVE: 'dual_solve',
  CONSENSUS_PROTOCOL: 'consensus_protocol',
  OFFICER_PANEL: 'officer_panel',
  FOUNDER: 'founder',
});

/**
 * Existing protocol — not a new one. Copied from
 * LOOP_ESCALATION_CONTRACT recovery_ladder_v2.consensus_protocol and
 * factory-allocation compareRedundantResults. Disagreement is not a tie
 * and not a majority. The goal is not A vs B; the answer may combine
 * pieces or be a third solution. More models join if needed; still 100%.
 */
export const REPAIR_CONSENSUS_PROTOCOL = Object.freeze({
  source: 'builderos-reboot/LOOP_ESCALATION_CONTRACT.json#recovery_ladder_v2.consensus_protocol',
  also: 'scripts/factory-allocation.mjs#compareRedundantResults',
  threshold: 'unanimous_100_percent',
  partial_consensus_forbidden: true,
  soft_consensus_forbidden: true,
  forbidden_action: 'majority_vote',
  protocol: Object.freeze([
    'each side defends the peer solution',
    'each side attacks its own solution',
    'each side states its assumptions explicitly',
    'seek a third solution neither proposed — combine pieces; the answer may be E',
    'search how others solved this (web research)',
    'name unintended consequences, positive and negative',
    'if still unresolved, add more models (stage 3) — still unanimous, never majority',
    'test against Reality wherever a test exists',
  ]),
});

const FOUNDER_CHECKS = new Set(['product_backlog', 'competitive_gap', 'founder_stop']);
const SIMPLE_CHECKS = new Set(['workflow_health']);
const SIMPLE_IDS = new Set(['taloa_not_running', 'factory2_tick_stale']);
const BREAKING_IDS = new Set(['governed_loop_stale', 'governed_hard_halt']);
const BREAKING_CHECKS = new Set(['fixer_unrepaired']);
const COMPLEX_CHECKS = new Set(['ci_health', 'fixer_failed', 'receipt_integrity']);

function isSimpleId(id) {
  const s = String(id || '');
  if (SIMPLE_IDS.has(s)) return true;
  if (s.startsWith('false_block:')) return true;
  return false;
}

/**
 * Pure. Classifies how SENTRY must hand a finding to the Conductor.
 */
export function classifyRepairHandoff(finding) {
  if (!finding || typeof finding !== 'object') {
    return {
      lane: REPAIR_LANE.DUAL_SOLVE,
      officers: ['sentry', 'conductor'],
      withhold_solution: true,
      reason: 'invalid_finding',
    };
  }
  const check = String(finding.check || '');
  const id = String(finding.id || '');

  if (FOUNDER_CHECKS.has(check)) {
    return {
      lane: REPAIR_LANE.FOUNDER,
      officers: ['sentry', 'chair'],
      withhold_solution: false,
      reason: 'founder_authority',
    };
  }
  if (BREAKING_CHECKS.has(check) || BREAKING_IDS.has(id)) {
    return {
      lane: REPAIR_LANE.OFFICER_PANEL,
      officers: ['sentry', 'conductor', 'architect', 'wisdom'],
      withhold_solution: false,
      reason: 'breaking',
    };
  }
  if (COMPLEX_CHECKS.has(check) || id.startsWith('fixer_failed:')) {
    return {
      lane: REPAIR_LANE.DUAL_SOLVE,
      officers: ['sentry', 'conductor'],
      withhold_solution: true,
      reason: 'implications',
    };
  }
  if (SIMPLE_CHECKS.has(check) || isSimpleId(id)) {
    return {
      lane: REPAIR_LANE.SEND_CONCLUSION,
      officers: ['sentry', 'conductor'],
      withhold_solution: false,
      reason: 'simple',
    };
  }
  if (check === 'system_still_working') {
    return {
      lane: REPAIR_LANE.SEND_CONCLUSION,
      officers: ['sentry', 'conductor'],
      withhold_solution: false,
      reason: 'simple',
    };
  }
  return {
    lane: REPAIR_LANE.DUAL_SOLVE,
    officers: ['sentry', 'conductor'],
    withhold_solution: true,
    reason: 'unclassified',
  };
}

/**
 * Packet the Conductor is allowed to see. When withhold is on, the solution
 * stays with SENTRY until after the Conductor has written its own.
 */
export function conductorProblemPacket(finding, { withhold = false } = {}) {
  const packet = {
    id: finding?.id,
    check: finding?.check,
    severity: finding?.severity,
    summary: finding?.summary,
    detected_at: finding?.detected_at,
  };
  if (!withhold) packet.proposed_solution = finding?.proposed_solution;
  return packet;
}

function tokens(text) {
  return (String(text || '').toLowerCase().match(/[a-z0-9_./-]+/g) || [])
    .map((t) => t.replace(/\.+$/, ''))
    .filter(Boolean);
}

/**
 * Pure. Two solutions agree when they name the same target path or the same
 * playbook verb. Disagreement is not a tie and not a vote — it enters the
 * existing consensus protocol (100%, combine, argue both sides).
 */
export function compareRepairSolutions(sentrySolution, conductorSolution) {
  const a = String(sentrySolution || '').trim();
  const b = String(conductorSolution || '').trim();
  if (a.length < 10 || b.length < 10) {
    return { consensus: false, reason: 'missing_solution' };
  }
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const filesA = [...ta].filter((t) => t.includes('/') && t.length > 4);
  const sharedFiles = filesA.filter((f) => tb.has(f));
  if (sharedFiles.length) {
    return { consensus: true, reason: 'shared_target', shared: sharedFiles.slice(0, 5) };
  }
  const playbook = ['relaunch', 'restart', 'reschedule', 'claim', 'not_on_blueprint', 'bind-migration'];
  const sharedPlay = playbook.filter((w) => ta.has(w) && tb.has(w));
  if (sharedPlay.length) {
    return { consensus: true, reason: 'shared_playbook', shared: sharedPlay };
  }
  return { consensus: false, reason: 'divergent', next_action: 'consensus_protocol' };
}

/**
 * Pure. A consensus round seals only when every named party accepts the
 * synthesized repair. Two of three is majority and is refused.
 */
export function sealConsensusRound(round) {
  const synthesized = String(round?.synthesized || '').trim();
  if (synthesized.length < 10) {
    return { unanimous: false, reason: 'missing_synthesis', forbidden_action: 'majority_vote' };
  }
  const sentry = round?.sentry_accepts === true;
  const conductor = round?.conductor_accepts === true;
  const extra = Array.isArray(round?.other_accepts) ? round.other_accepts : [];
  const parties = [sentry, conductor, ...extra.map(Boolean)];
  const accepted = parties.filter(Boolean).length;
  if (accepted === parties.length && parties.length >= 2) {
    return { unanimous: true, reason: 'unanimous_100_percent', synthesized };
  }
  return {
    unanimous: false,
    reason: 'not_unanimous',
    accepted,
    parties: parties.length,
    forbidden_action: 'majority_vote',
  };
}

/**
 * Stamps the handoff onto a finding. Does not mutate the input.
 * `conductorSolution` is omitted on send_conclusion (Conductor accepts SENTRY's).
 * `consensusRound` is the protocol result after dissent — never a majority vote.
 */
export function applyRepairHandoff(finding, { conductorSolution = undefined, consensusRound = undefined } = {}) {
  const classified = classifyRepairHandoff(finding);
  const packet = conductorProblemPacket(finding, { withhold: classified.withhold_solution });
  const base = {
    ...finding,
    repair_lane: classified.lane,
    repair_officers: classified.officers,
    repair_reason: classified.reason,
    sentry_solution_withheld: classified.withhold_solution === true,
    conductor_packet: packet,
  };

  if (classified.lane === REPAIR_LANE.SEND_CONCLUSION) {
    return {
      ...base,
      conductor_status: 'accepted_sentry_conclusion',
      repair_consensus: true,
    };
  }

  if (classified.lane === REPAIR_LANE.FOUNDER) {
    return { ...base, conductor_status: 'not_applicable', repair_consensus: null };
  }

  if (consensusRound) {
    const sealed = sealConsensusRound(consensusRound);
    return {
      ...base,
      conductor_solution: finding.conductor_solution,
      conductor_status: sealed.unanimous ? 'consensus' : 'consensus_protocol',
      repair_consensus: sealed.unanimous === true,
      repair_compare: finding.repair_compare,
      repair_lane: sealed.unanimous ? REPAIR_LANE.DUAL_SOLVE : REPAIR_LANE.CONSENSUS_PROTOCOL,
      repair_officers: classified.officers,
      forbidden_action: 'majority_vote',
      consensus_protocol: REPAIR_CONSENSUS_PROTOCOL,
      consensus_round: { ...consensusRound, ...sealed },
    };
  }

  if (classified.lane === REPAIR_LANE.OFFICER_PANEL) {
    return {
      ...base,
      conductor_status: 'officer_panel',
      repair_consensus: null,
      forbidden_action: 'majority_vote',
      consensus_protocol: REPAIR_CONSENSUS_PROTOCOL,
      next_action: 'consensus_protocol',
    };
  }

  if (conductorSolution) {
    const compared = compareRepairSolutions(finding.proposed_solution, conductorSolution);
    if (compared.consensus) {
      return {
        ...base,
        conductor_solution: conductorSolution,
        conductor_status: 'consensus',
        repair_consensus: true,
        repair_compare: compared,
        repair_lane: REPAIR_LANE.DUAL_SOLVE,
        repair_officers: classified.officers,
      };
    }
    return {
      ...base,
      conductor_solution: conductorSolution,
      conductor_status: 'consensus_protocol',
      repair_consensus: false,
      repair_compare: compared,
      repair_lane: REPAIR_LANE.CONSENSUS_PROTOCOL,
      repair_officers: classified.officers,
      forbidden_action: 'majority_vote',
      consensus_protocol: REPAIR_CONSENSUS_PROTOCOL,
      next_action: 'consensus_protocol',
    };
  }

  return {
    ...base,
    conductor_status: 'awaiting_conductor_solution',
    repair_consensus: null,
  };
}

export function readyForArchitect(finding) {
  if (!finding || finding.chair_status !== 'approved') return false;
  if (finding.repair_consensus !== true) return false;
  if (finding.repair_lane === REPAIR_LANE.SEND_CONCLUSION) return true;
  if (finding.repair_lane === REPAIR_LANE.DUAL_SOLVE) return true;
  return false;
}

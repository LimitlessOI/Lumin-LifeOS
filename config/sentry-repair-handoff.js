/**
 * SYNOPSIS: SENTRY -> Conductor repair handoff. SENTRY must solve what it
 * finds, then send it to the Conductor. Simple issues travel as a finished
 * conclusion (issue + solution) so two agents do not re-work the obvious.
 * Complicated issues withhold SENTRY's solution; the Conductor sees only the
 * problem, produces its own repair, then the two are compared. Agreement is
 * not enough by itself: once a second independent model is involved, the
 * 1+1=3 hidden-alternatives gate must clear before Architect handoff.
 * Breaking issues bring in more officers.
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

export const REPAIR_CONSENSUS_PROTOCOL = Object.freeze({
  source: 'builderos-reboot/LOOP_ESCALATION_CONTRACT.json#recovery_ladder_v2.consensus_protocol',
  also: 'docs/constitution/FOUNDER_AI_OPERATING_PROTOCOL.md#8-113-escalation-invariant',
  threshold: 'unanimous_100_percent',
  partial_consensus_forbidden: true,
  soft_consensus_forbidden: true,
  early_consensus_terminal_forbidden: true,
  hidden_alternatives_required: true,
  forbidden_action: 'majority_vote',
  protocol: Object.freeze([
    'each side defends the peer solution',
    'each side attacks its own solution',
    'each side states its assumptions explicitly',
    'search hidden alternatives even when the independent drafts initially agree',
    'seek a third solution neither proposed - combine pieces; the answer may be E',
    'search how others solved this (web research when available and warranted)',
    'name unintended consequences, positive and negative',
    'if still unresolved, add more models (stage 3) - still unanimous, never majority',
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

export function classifyRepairHandoff(finding) {
  if (!finding || typeof finding !== 'object') {
    return { lane: REPAIR_LANE.DUAL_SOLVE, officers: ['sentry', 'conductor'], withhold_solution: true, reason: 'invalid_finding' };
  }
  const check = String(finding.check || '');
  const id = String(finding.id || '');

  if (FOUNDER_CHECKS.has(check)) {
    return { lane: REPAIR_LANE.FOUNDER, officers: ['sentry', 'conductor'], withhold_solution: false, reason: 'founder_authority' };
  }
  if (BREAKING_CHECKS.has(check) || BREAKING_IDS.has(id)) {
    return { lane: REPAIR_LANE.OFFICER_PANEL, officers: ['sentry', 'conductor', 'architect', 'wisdom'], withhold_solution: false, reason: 'breaking' };
  }
  if (COMPLEX_CHECKS.has(check) || id.startsWith('fixer_failed:')) {
    return { lane: REPAIR_LANE.DUAL_SOLVE, officers: ['sentry', 'conductor'], withhold_solution: true, reason: 'implications' };
  }
  if (SIMPLE_CHECKS.has(check) || isSimpleId(id) || check === 'system_still_working') {
    return { lane: REPAIR_LANE.SEND_CONCLUSION, officers: ['sentry', 'conductor'], withhold_solution: false, reason: 'simple' };
  }
  return { lane: REPAIR_LANE.DUAL_SOLVE, officers: ['sentry', 'conductor'], withhold_solution: true, reason: 'unclassified' };
}

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

export function compareRepairSolutions(sentrySolution, conductorSolution) {
  const a = String(sentrySolution || '').trim();
  const b = String(conductorSolution || '').trim();
  if (a.length < 10 || b.length < 10) return { consensus: false, reason: 'missing_solution' };

  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const filesA = [...ta].filter((t) => t.includes('/') && t.length > 4);
  const sharedFiles = filesA.filter((f) => tb.has(f));
  if (sharedFiles.length) return { consensus: true, reason: 'shared_target', shared: sharedFiles.slice(0, 5) };

  const playbook = ['relaunch', 'restart', 'reschedule', 'claim', 'not_on_blueprint', 'bind-migration'];
  const sharedPlay = playbook.filter((w) => ta.has(w) && tb.has(w));
  if (sharedPlay.length) return { consensus: true, reason: 'shared_playbook', shared: sharedPlay };

  return { consensus: false, reason: 'divergent', next_action: 'consensus_protocol' };
}

function hiddenAlternativesCleared(round) {
  const explicitCandidate = String(round?.materially_new_candidate || '').trim();
  const explicitExhaustive = round?.exhaustive_search_no_superior === true;
  const explicitSearch = round?.hidden_alternatives_checked === true;
  if (explicitSearch && (explicitCandidate.length >= 10 || explicitExhaustive)) return true;

  const synthesized = String(round?.synthesized || '').trim();
  const argued = round?.argued_both_sides === true;
  const positive = String(round?.unintended_positive || '').trim();
  const negative = String(round?.unintended_negative || '').trim();
  return argued && synthesized.length >= 10 && positive.length >= 3 && negative.length >= 3;
}

export function sealConsensusRound(round) {
  const synthesized = String(round?.synthesized || '').trim();
  if (synthesized.length < 10) {
    return { unanimous: false, reason: 'missing_synthesis', forbidden_action: 'majority_vote' };
  }
  if (!hiddenAlternativesCleared(round)) {
    return {
      unanimous: false,
      reason: 'hidden_alternatives_not_cleared',
      required: ['hidden_alternatives_search', 'argue_both_sides', 'positive_and_negative_consequences'],
      forbidden_action: 'early_consensus_terminal',
    };
  }

  const sentry = round?.sentry_accepts === true;
  const conductor = round?.conductor_accepts === true;
  const extra = Array.isArray(round?.other_accepts) ? round.other_accepts : [];
  const parties = [sentry, conductor, ...extra.map(Boolean)];
  const accepted = parties.filter(Boolean).length;
  if (accepted === parties.length && parties.length >= 2) {
    return { unanimous: true, reason: 'unanimous_100_percent', synthesized };
  }
  return { unanimous: false, reason: 'not_unanimous', accepted, parties: parties.length, forbidden_action: 'majority_vote' };
}

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
    return { ...base, conductor_status: 'accepted_sentry_conclusion', repair_consensus: true };
  }
  if (classified.lane === REPAIR_LANE.FOUNDER) {
    return { ...base, conductor_status: 'founder_authority_only', repair_consensus: null };
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
      forbidden_action: sealed.forbidden_action || 'majority_vote',
      consensus_protocol: REPAIR_CONSENSUS_PROTOCOL,
      consensus_round: { ...consensusRound, ...sealed },
      next_action: sealed.unanimous ? 'architect_handoff' : 'consensus_protocol',
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
    return {
      ...base,
      conductor_solution: conductorSolution,
      conductor_status: compared.consensus ? 'hidden_alternatives_required' : 'consensus_protocol',
      repair_consensus: false,
      repair_compare: compared,
      repair_lane: REPAIR_LANE.CONSENSUS_PROTOCOL,
      repair_officers: classified.officers,
      forbidden_action: compared.consensus ? 'early_consensus_terminal' : 'majority_vote',
      consensus_protocol: REPAIR_CONSENSUS_PROTOCOL,
      next_action: 'consensus_protocol',
    };
  }

  return { ...base, conductor_status: 'awaiting_conductor_solution', repair_consensus: null };
}

export function readyForArchitect(finding) {
  if (!finding) return false;
  const conductorApproved = finding.chair_status === 'approved' || finding.conductor_review_status === 'approved';
  if (!conductorApproved) return false;
  const deliberationApproved = finding.conductor_status === 'consensus' || finding.conductor_status === 'accepted_sentry_conclusion';
  if (!deliberationApproved || finding.repair_consensus !== true) return false;
  return finding.repair_lane === REPAIR_LANE.SEND_CONCLUSION || finding.repair_lane === REPAIR_LANE.DUAL_SOLVE;
}

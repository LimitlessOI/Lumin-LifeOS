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
  OFFICER_PANEL: 'officer_panel',
  FOUNDER: 'founder',
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
 * playbook verb. Disagreement is not a tie — it escalates to the officer panel.
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
  return { consensus: false, reason: 'divergent' };
}

/**
 * Stamps the handoff onto a finding. Does not mutate the input.
 * `conductorSolution` is omitted on send_conclusion (Conductor accepts SENTRY's).
 */
export function applyRepairHandoff(finding, { conductorSolution = undefined } = {}) {
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

  if (classified.lane === REPAIR_LANE.OFFICER_PANEL) {
    return {
      ...base,
      conductor_status: 'officer_panel',
      repair_consensus: null,
    };
  }

  if (conductorSolution) {
    const compared = compareRepairSolutions(finding.proposed_solution, conductorSolution);
    return {
      ...base,
      conductor_solution: conductorSolution,
      conductor_status: compared.consensus ? 'consensus' : 'dissent',
      repair_consensus: compared.consensus,
      repair_compare: compared,
      repair_lane: compared.consensus ? REPAIR_LANE.DUAL_SOLVE : REPAIR_LANE.OFFICER_PANEL,
      repair_officers: compared.consensus
        ? classified.officers
        : ['sentry', 'conductor', 'architect', 'wisdom'],
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
  if (finding.repair_lane === REPAIR_LANE.SEND_CONCLUSION && finding.repair_consensus === true) return true;
  if (finding.repair_lane === REPAIR_LANE.DUAL_SOLVE && finding.repair_consensus === true) return true;
  return false;
}

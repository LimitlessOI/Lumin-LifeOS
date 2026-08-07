/**
 * SYNOPSIS: Exports recordConsensusSession, recordHistDeptCase, recordCfoDeliberationReceipt
 * — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/historian/record-consensus-session.js.
 */
export function recordConsensusSession(entry) {
  return {
    type: 'consensus_session',
    original_positions: entry.original_positions,
    final_synthesis: entry.final_synthesis,
    participants: entry.participants
  };
}

// GAP-FILL: seed-mission-deliberation.js has imported this export since it was
// written, but it never existed here -- every call to ensureMissionDeliberation
// threw SyntaxError at import time, so no mission has ever successfully seeded a
// Hist case this way. Added symmetric to recordConsensusSession's own shape-only
// pattern (no disk I/O here; writeMissionDeliberationFile persists the caller's
// gatePayload separately).
export function recordHistDeptCase(entry) {
  return {
    type: 'hist_case',
    session_id: entry.session_id,
    problem: entry.problem,
    case_text: entry.case_text,
    ideas: entry.ideas,
    opportunity: entry.opportunity,
    uncertainty: entry.uncertainty,
  };
}

// GAP-FILL: same missing-export bug as recordHistDeptCase above.
export function recordCfoDeliberationReceipt(entry) {
  return {
    type: 'cfo_receipt',
    session_id: entry.session_id,
    dept: entry.dept,
    role: entry.role,
    model: entry.model,
    tokens: entry.tokens,
    cost_usd: entry.cost_usd,
    founder_priority_mode: entry.founder_priority_mode,
  };
}

/**
 * SYNOPSIS: Persist consensus session to Historian jsonl + deliberation gate ledger.
 */
import { appendHistorianRecord } from '../historian/append-record.js';
import { appendDeliberationRecord } from '../deliberation/validate-deliberation-gate.js';
import { validateConsensusSession } from '../canon/deliberation-governance.js';

/**
 * Persist consensus session to Historian jsonl + deliberation gate ledger.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export function recordConsensusSession(entry) {
  const v = validateConsensusSession(entry);
  if (!v.ok) {
    return { ok: false, errors: v.errors };
  }

  const payload = {
    type: 'consensus_session',
    session_id: entry.session_id,
    original_positions: entry.original_positions || [],
    brainstorm_ids: entry.brainstorm_ids || [],
    final_synthesis: entry.final_synthesis || null,
    position_e_or_k_found: Boolean(entry.position_e_or_k_found),
    participants: entry.participants || [],
    vote_counts: entry.vote_counts || null,
    predicted_outcome: entry.predicted_outcome || null,
    protocol_version: entry.protocol_version || 'v2.7',
    future_back_horizons: entry.future_back_horizons || {},
    competitive_scan: entry.competitive_scan || [],
  };

  appendDeliberationRecord(payload);
  return appendHistorianRecord(payload);
}

export function recordHistDeptCase(entry) {
  const payload = {
    type: 'hist_case',
    session_id: entry.session_id,
    problem: entry.problem || null,
    case_text: entry.case_text,
    ideas: entry.ideas || [],
    opportunity: entry.opportunity || null,
    evidence_links: entry.evidence_links || [],
    uncertainty: entry.uncertainty || 'THINK',
  };
  appendDeliberationRecord(payload);
  return appendHistorianRecord(payload);
}

export function recordCfoDeliberationReceipt(entry) {
  const payload = {
    type: 'cfo_receipt',
    session_id: entry.session_id,
    dept: entry.dept || 'CFO',
    role: entry.role || null,
    model: entry.model || null,
    tokens: entry.tokens ?? null,
    cost_usd: entry.cost_usd ?? null,
    founder_priority_mode: Boolean(entry.founder_priority_mode),
  };
  appendDeliberationRecord(payload);
  return appendHistorianRecord(payload);
}

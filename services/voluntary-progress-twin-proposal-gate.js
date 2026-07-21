/**
 * SYNOPSIS: Exports proposeTwinUpdate — services/voluntary-progress-twin-proposal-gate.js.
 */
import { writeTwin } from './lifere-twin-store.js';

export async function proposeTwinUpdate(pool, { user_id, subject, current_value = null, proposed_value, truth_grade = 'GUESS', confidence = null, evidence = null, rationale, proposed_by }) {
  if (!['KNOW', 'THINK', 'GUESS'].includes(truth_grade)) {
    throw new Error('Invalid truth_grade value');
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    current_value JSONB,
    proposed_value JSONB NOT NULL,
    truth_grade TEXT NOT NULL DEFAULT 'GUESS',
    confidence NUMERIC,
    evidence TEXT,
    rationale TEXT,
    proposed_by TEXT NOT NULL,
    required_approver TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    twin_write_receipt JSONB
  )`);

  const result = await pool.query(
    `INSERT INTO voluntary_progress_twin_proposals (
      user_id, subject, current_value, proposed_value, truth_grade, confidence, evidence, rationale, proposed_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
    [user_id, subject, current_value, proposed_value, truth_grade, confidence, evidence, rationale, proposed_by]
  );

  return result.rows[0];
}

export async function approveTwinUpdateProposal(pool, { proposal_id, approved_by, tenantId = 'default', twinKey, moduleKey = null }) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    current_value JSONB,
    proposed_value JSONB NOT NULL,
    truth_grade TEXT NOT NULL DEFAULT 'GUESS',
    confidence NUMERIC,
    evidence TEXT,
    rationale TEXT,
    proposed_by TEXT NOT NULL,
    required_approver TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    twin_write_receipt JSONB
  )`);

  const proposalResult = await pool.query(
    `SELECT * FROM voluntary_progress_twin_proposals WHERE id = $1 AND status = 'pending'`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new Error('Proposal not found or not pending');
  }

  const proposal = proposalResult.rows[0];
  const writeReceipt = await writeTwin({
    user_id: proposal.user_id,
    proposed_value: proposal.proposed_value,
    requesterId: approved_by
  });

  const updateResult = await pool.query(
    `UPDATE voluntary_progress_twin_proposals SET status = 'approved', decided_at = now(), twin_write_receipt = $2 WHERE id = $1 RETURNING *`,
    [proposal_id, writeReceipt]
  );

  return updateResult.rows[0];
}

export async function rejectTwinUpdateProposal(pool, { proposal_id, rejected_by, reason = null }) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    current_value JSONB,
    proposed_value JSONB NOT NULL,
    truth_grade TEXT NOT NULL DEFAULT 'GUESS',
    confidence NUMERIC,
    evidence TEXT,
    rationale TEXT,
    proposed_by TEXT NOT NULL,
    required_approver TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    twin_write_receipt JSONB
  )`);

  await pool.query(
    `UPDATE voluntary_progress_twin_proposals SET status = 'rejected', decided_at = now(), rationale = COALESCE(rationale, '') || $2 WHERE id = $1`,
    [proposal_id, reason ? ` Rejected by ${rejected_by}: ${reason}` : '']
  );
}

export async function getPendingProposals(pool, { user_id, limit = 50 } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    current_value JSONB,
    proposed_value JSONB NOT NULL,
    truth_grade TEXT NOT NULL DEFAULT 'GUESS',
    confidence NUMERIC,
    evidence TEXT,
    rationale TEXT,
    proposed_by TEXT NOT NULL,
    required_approver TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    twin_write_receipt JSONB
  )`);

  const result = await pool.query(
    `SELECT * FROM voluntary_progress_twin_proposals WHERE user_id = $1 AND status = 'pending' ORDER BY proposed_at DESC LIMIT $2`,
    [user_id, limit]
  );

  return result.rows;
}

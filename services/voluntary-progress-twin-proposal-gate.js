/**
 * SYNOPSIS: Exports proposeTwinUpdate — services/voluntary-progress-twin-proposal-gate.js.
 */
import { writeTwin } from './lifere-twin-store.js';

export async function proposeTwinUpdate(pool, { user_id, subject, current_value = null, proposed_value, truth_grade = 'GUESS', confidence = null, evidence = null, rationale, proposed_by }) {
  if (!['KNOW', 'THINK', 'GUESS'].includes(truth_grade)) {
    throw new Error('Invalid truth_grade');
  }

  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, subject TEXT NOT NULL, current_value JSONB, proposed_value JSONB NOT NULL, truth_grade TEXT NOT NULL DEFAULT \'GUESS\', confidence NUMERIC, evidence TEXT, rationale TEXT, proposed_by TEXT NOT NULL, required_approver TEXT NOT NULL DEFAULT \'user\', status TEXT NOT NULL DEFAULT \'pending\', proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ, twin_write_receipt JSONB)');

  const result = await pool.query(
    `INSERT INTO voluntary_progress_twin_proposals 
     (user_id, subject, current_value, proposed_value, truth_grade, confidence, evidence, rationale, proposed_by, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') 
     RETURNING *`,
    [user_id, subject, JSON.stringify(current_value), JSON.stringify(proposed_value), truth_grade, confidence, evidence, rationale, proposed_by]
  );

  return result.rows[0];
}

export async function approveTwinUpdateProposal(pool, { proposal_id, approved_by, tenantId = 'default', twinKey, moduleKey = null }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, subject TEXT NOT NULL, current_value JSONB, proposed_value JSONB NOT NULL, truth_grade TEXT NOT NULL DEFAULT \'GUESS\', confidence NUMERIC, evidence TEXT, rationale TEXT, proposed_by TEXT NOT NULL, required_approver TEXT NOT NULL DEFAULT \'user\', status TEXT NOT NULL DEFAULT \'pending\', proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ, twin_write_receipt JSONB)');

  const result = await pool.query('SELECT * FROM voluntary_progress_twin_proposals WHERE id = $1', [proposal_id]);

  if (result.rows.length === 0 || result.rows[0].status !== 'pending') {
    throw new Error('Proposal does not exist or is not pending');
  }

  const proposal = result.rows[0];

  const receipt = await writeTwin({
    tenantId,
    userId: proposal.user_id,
    twinKey,
    moduleKey,
    payload: proposal.proposed_value,
    requesterId: approved_by
  });

  const updateResult = await pool.query(
    `UPDATE voluntary_progress_twin_proposals 
     SET status = 'approved', decided_at = now(), twin_write_receipt = $1 
     WHERE id = $2 
     RETURNING *`,
    [JSON.stringify(receipt), proposal_id]
  );

  return updateResult.rows[0];
}

export async function rejectTwinUpdateProposal(pool, { proposal_id, rejected_by, reason = null }) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, subject TEXT NOT NULL, current_value JSONB, proposed_value JSONB NOT NULL, truth_grade TEXT NOT NULL DEFAULT \'GUESS\', confidence NUMERIC, evidence TEXT, rationale TEXT, proposed_by TEXT NOT NULL, required_approver TEXT NOT NULL DEFAULT \'user\', status TEXT NOT NULL DEFAULT \'pending\', proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ, twin_write_receipt JSONB)');

  const result = await pool.query('SELECT * FROM voluntary_progress_twin_proposals WHERE id = $1', [proposal_id]);

  if (result.rows.length === 0 || result.rows[0].status !== 'pending') {
    throw new Error('Proposal does not exist or is not pending');
  }

  const proposal = result.rows[0];
  const newRationale = proposal.rationale ? `${proposal.rationale} ${reason}` : reason;

  const updateResult = await pool.query(
    `UPDATE voluntary_progress_twin_proposals 
     SET status = 'rejected', decided_at = now(), rationale = $1 
     WHERE id = $2 
     RETURNING *`,
    [newRationale, proposal_id]
  );

  return updateResult.rows[0];
}

export async function getPendingProposals(pool, { user_id, limit = 50 } = {}) {
  await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_twin_proposals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, subject TEXT NOT NULL, current_value JSONB, proposed_value JSONB NOT NULL, truth_grade TEXT NOT NULL DEFAULT \'GUESS\', confidence NUMERIC, evidence TEXT, rationale TEXT, proposed_by TEXT NOT NULL, required_approver TEXT NOT NULL DEFAULT \'user\', status TEXT NOT NULL DEFAULT \'pending\', proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ, twin_write_receipt JSONB)');

  const result = await pool.query(
    `SELECT * FROM voluntary_progress_twin_proposals 
     WHERE user_id = $1 AND status = 'pending' 
     ORDER BY proposed_at DESC 
     LIMIT $2`,
    [user_id, limit]
  );

  return result.rows;
}

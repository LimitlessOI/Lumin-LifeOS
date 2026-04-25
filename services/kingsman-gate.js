/**
 * Kingsman Protocol — minimal runtime audit hook (Phase 1).
 * Logs a one-row audit for every council call so Amendment 33 is not "paper only."
 * Future: policy engine can block or require human approval based on risk_score.
 *
 * @ssot docs/projects/AMENDMENT_33_KINGSMAN_PROTOCOL.md
 */

import crypto from 'crypto';

/**
 * @param {{ pool?: import('pg').Pool, member: string, taskType: string, prompt: string }} args
 */
export async function kingsmanAudit({ pool, member, taskType, prompt }) {
  if (!pool || !prompt) return;
  const hash = crypto.createHash('sha256').update(String(prompt)).digest('hex').slice(0, 24);
  const lower = String(prompt).toLowerCase();
  let risk = 0;
  let notes = '';
  if (/\b(manipulate|dark pattern|trick the user|without (their )?consent|hide this from)\b/.test(lower)) {
    risk = 2;
    notes = 'manipulation_language_heuristic';
  } else if (/\b(delete all|drop table|override safety)\b/.test(lower)) {
    risk = 3;
    notes = 'destructive_language_heuristic';
  }
  await pool
    .query(
      `INSERT INTO kingsman_audit_log (member, task_type, prompt_hash, risk_score, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [member, taskType || 'unknown', hash, risk, notes || null]
    )
    .catch(() => {});
}

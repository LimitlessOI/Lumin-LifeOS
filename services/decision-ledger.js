/**
 * SYNOPSIS: Unified founder decision ledger — governance spine (GAP-002 / GAP-017).
 * Unified founder decision ledger — governance spine (GAP-002 / GAP-017).
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md §4.4
 */

import { randomUUID } from 'node:crypto';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

export async function createDecision(pool, fields = {}) {
  const decisionId = normalizeText(fields.decision_id) || `dec-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const { rows } = await pool.query(
    `INSERT INTO founder_decision_ledger (
       decision_id, mission_id, actor, decision_type, authority_source,
       options_considered, chosen_option, reason, evidence_links, reversibility, metadata_json
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      decisionId,
      fields.mission_id ?? null,
      normalizeText(fields.actor) || 'system',
      normalizeText(fields.decision_type) || 'general',
      fields.authority_source ?? null,
      JSON.stringify(normalizeJsonArray(fields.options_considered)),
      fields.chosen_option ?? null,
      fields.reason ?? null,
      JSON.stringify(normalizeJsonArray(fields.evidence_links)),
      normalizeText(fields.reversibility) || 'unknown',
      fields.metadata_json && typeof fields.metadata_json === 'object' ? fields.metadata_json : {},
    ],
  );
  return rows[0];
}

export async function getDecisionById(pool, decision_id) {
  const { rows } = await pool.query(
    `SELECT * FROM founder_decision_ledger WHERE decision_id = $1 LIMIT 1`,
    [decision_id],
  );
  return rows[0] || null;
}

export async function listDecisionsByMission(pool, mission_id, { limit = 50 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const { rows } = await pool.query(
    `SELECT * FROM founder_decision_ledger
      WHERE mission_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [mission_id, capped],
  );
  return rows;
}

export async function listRecentDecisions(pool, { limit = 50, decision_type = null } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const params = [];
  let where = '';
  if (decision_type) {
    params.push(decision_type);
    where = `WHERE decision_type = $1`;
  }
  params.push(capped);
  const limitIdx = params.length;
  const { rows } = await pool.query(
    `SELECT * FROM founder_decision_ledger ${where} ORDER BY created_at DESC LIMIT $${limitIdx}`,
    params,
  );
  return rows;
}

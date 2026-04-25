/**
 * services/lifeos-gate-change-proposals.js
 *
 * Persistence for North Star §2.6 ¶8 / Companion §5.5 — gate-change & efficiency
 * proposals (raise → council review → human status). Does not call AI.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const VALID_LABEL = new Set(['THINK', 'GUESS']);
const VALID_STATUS = new Set(['raised', 'debated', 'approved', 'rejected', 'implemented']);
const VALID_VERDICT = new Set(['APPROVE', 'REJECT', 'DEFER', 'UNKNOWN']);

function normalizeSteps(raw) {
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  if (raw == null) return [];
  return [String(raw).trim()].filter(Boolean);
}

/**
 * @param {{ pool: import('pg').Pool }} deps
 */
export function createLifeOSGateChangeProposals({ pool }) {
  async function create(row) {
    const {
      title,
      pain_summary,
      hypothesis_label,
      steps_to_remove,
      proposed_equivalence_metrics,
      created_by,
    } = row;
    if (!title || !pain_summary) {
      const e = new Error('title and pain_summary are required');
      e.status = 400;
      throw e;
    }
    const label = String(hypothesis_label || '').toUpperCase();
    if (!VALID_LABEL.has(label)) {
      const e = new Error('hypothesis_label must be THINK or GUESS');
      e.status = 400;
      throw e;
    }
    const steps = normalizeSteps(steps_to_remove);
    const r = await pool.query(
      `INSERT INTO gate_change_proposals (
         title, pain_summary, hypothesis_label, steps_to_remove,
         proposed_equivalence_metrics, created_by
       ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)
       RETURNING *`,
      [
        String(title).slice(0, 500),
        String(pain_summary).slice(0, 8000),
        label,
        JSON.stringify(steps),
        proposed_equivalence_metrics != null
          ? String(proposed_equivalence_metrics).slice(0, 8000)
          : null,
        created_by != null ? String(created_by).slice(0, 200) : null,
      ]
    );
    return r.rows[0];
  }

  async function list({ status = null, limit = 50 } = {}) {
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    if (status) {
      const s = String(status).toLowerCase();
      if (!VALID_STATUS.has(s)) {
        const e = new Error('invalid status filter');
        e.status = 400;
        throw e;
      }
      const r = await pool.query(
        `SELECT * FROM gate_change_proposals WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
        [s, lim]
      );
      return r.rows;
    }
    const r = await pool.query(
      `SELECT * FROM gate_change_proposals ORDER BY created_at DESC LIMIT $1`,
      [lim]
    );
    return r.rows;
  }

  async function getById(id) {
    const r = await pool.query(`SELECT * FROM gate_change_proposals WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async function markDebated(id, {
    council_output,
    council_model,
    council_verdict,
    council_rounds_json,
    consensus_reached,
    consensus_summary,
  }) {
    let verdict = council_verdict ? String(council_verdict).toUpperCase() : null;
    if (verdict && !VALID_VERDICT.has(verdict)) verdict = 'UNKNOWN';
    const r = await pool.query(
      `UPDATE gate_change_proposals SET
         updated_at = NOW(),
         status = 'debated',
         council_output = $2,
         council_model = $3,
         council_verdict = $4,
         council_rounds_json = $5::jsonb,
         consensus_reached = $6,
         consensus_summary = $7
       WHERE id = $1 AND status = 'raised'
       RETURNING *`,
      [
        id,
        council_output != null ? String(council_output) : null,
        council_model || null,
        verdict,
        council_rounds_json ? JSON.stringify(council_rounds_json) : null,
        typeof consensus_reached === 'boolean' ? consensus_reached : null,
        consensus_summary != null ? String(consensus_summary) : null,
      ]
    );
    return r.rows[0] || null;
  }

  async function setStatus(id, status) {
    const s = String(status).toLowerCase();
    if (!['approved', 'rejected', 'implemented'].includes(s)) {
      const e = new Error('status must be approved, rejected, or implemented');
      e.status = 400;
      throw e;
    }
    const r = await pool.query(
      `UPDATE gate_change_proposals SET updated_at = NOW(), status = $2::text WHERE id = $1 RETURNING *`,
      [id, s]
    );
    return r.rows[0] || null;
  }

  return { create, list, getById, markDebated, setStatus };
}

/**
 * Parse trailing VERDICT line from council output (instruction-enforced).
 * @param {string} text
 * @returns {'APPROVE'|'REJECT'|'DEFER'|'UNKNOWN'|null}
 */
export function parseCouncilVerdict(text) {
  const t = String(text || '');
  const m = t.match(/\bVERDICT:\s*(APPROVE|REJECT|DEFER|UNKNOWN)\b/i);
  if (!m) return null;
  const v = m[1].toUpperCase();
  return VALID_VERDICT.has(v) ? v : 'UNKNOWN';
}

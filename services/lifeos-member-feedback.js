/**
 * SYNOPSIS: Member feedback → founder intake queue (never builder execute).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const STATUSES = new Set(['queued', 'triaged', 'accepted', 'declined', 'archived']);

export function createMemberFeedbackIntake({ pool } = {}) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('createMemberFeedbackIntake requires pool');
  }

  async function submit({ userId = null, handle = null, category = 'general', body, context = {} } = {}) {
    const text = String(body || '').trim();
    if (!text) throw new Error('feedback body required');
    if (text.length > 8000) throw new Error('feedback too long');

    const { rows } = await pool.query(
      `INSERT INTO lifeos_member_feedback (user_id, handle, category, body, context, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'queued')
       RETURNING id, user_id, handle, category, body, context, status, created_at`,
      [
        userId,
        handle ? String(handle).slice(0, 80) : null,
        String(category || 'general').slice(0, 64),
        text,
        JSON.stringify(context && typeof context === 'object' ? context : {}),
      ],
    );
    return {
      queuedForFounderReview: true,
      builder_execute: false,
      item: rows[0],
    };
  }

  async function listForFounder({ status = 'queued', limit = 50 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const params = [lim];
    let where = '';
    if (status && status !== 'all') {
      if (!STATUSES.has(status)) throw new Error('invalid status');
      where = 'WHERE status = $2';
      params.push(status);
    }
    const { rows } = await pool.query(
      `SELECT id, user_id, handle, category, body, context, status, operator_note, created_at, updated_at
         FROM lifeos_member_feedback
         ${where}
         ORDER BY created_at DESC
         LIMIT $1`,
      params,
    );
    return { items: rows, builder_execute: false };
  }

  async function updateStatus({ id, status, operatorNote = null } = {}) {
    if (!STATUSES.has(status)) throw new Error('invalid status');
    const { rows } = await pool.query(
      `UPDATE lifeos_member_feedback
          SET status = $2,
              operator_note = COALESCE($3, operator_note),
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, status, operator_note, updated_at`,
      [id, status, operatorNote],
    );
    if (!rows[0]) throw new Error('feedback not found');
    return rows[0];
  }

  return { submit, listForFounder, updateStatus };
}

/** @deprecated stub signature — prefer createMemberFeedbackIntake */
export function processFeedback(feedback) {
  return { queuedForFounderReview: true, builder_execute: false, feedback, persisted: false };
}
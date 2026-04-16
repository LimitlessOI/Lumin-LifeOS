/**
 * services/commitment-tracker.js
 *
 * Captures, tracks, and prods on commitments made by each LifeOS user.
 *
 * Core functions:
 *  - logCommitment()       — record a commitment (manual or auto-extracted)
 *  - extractCommitments()  — run AI over a conversation message to find implied commitments
 *  - markKept()            — user completed a commitment
 *  - markBroken()          — commitment was not met
 *  - snooze()              — push remind_at forward
 *  - getDueForProd()       — get commitments that need a nudge right now
 *  - logProd()             — record that a prod was sent
 *  - getOpen()             — list open commitments for a user
 *  - getOverdue()          — commitments past due_at that are still open
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const DEFAULT_PROD_INTERVAL_HOURS = 24;
const SNOOZE_HOURS = 4;

export function createCommitmentTracker(pool, callAI) {

  // ── Write ──────────────────────────────────────────────────────────────────

  async function logCommitment({ userId, title, description, committedTo, dueAt, weight, source, sourceRef, isPublic }) {
    const remindAt = dueAt
      ? new Date(new Date(dueAt).getTime() - 2 * 60 * 60 * 1000)  // 2h before due
      : new Date(Date.now() + DEFAULT_PROD_INTERVAL_HOURS * 60 * 60 * 1000);

    const { rows } = await pool.query(`
      INSERT INTO commitments
        (user_id, title, description, committed_to, due_at, remind_at,
         weight, source, source_ref, is_public)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      userId, title, description || null, committedTo || 'self',
      dueAt || null, remindAt,
      weight || 1, source || 'manual', sourceRef || null, isPublic || false,
    ]);
    return rows[0];
  }

  async function markKept(commitmentId) {
    const { rows } = await pool.query(`
      UPDATE commitments
      SET status = 'kept', kept_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'open'
      RETURNING *
    `, [commitmentId]);
    return rows[0] || null;
  }

  async function markBroken(commitmentId, reason) {
    const { rows } = await pool.query(`
      UPDATE commitments
      SET status = 'broken', broken_at = NOW(), broken_reason = $2, updated_at = NOW()
      WHERE id = $1 AND status = 'open'
      RETURNING *
    `, [commitmentId, reason || null]);
    return rows[0] || null;
  }

  async function snooze(commitmentId) {
    const snoozeUntil = new Date(Date.now() + SNOOZE_HOURS * 60 * 60 * 1000);
    const { rows } = await pool.query(`
      UPDATE commitments
      SET snoozed_until = $2,
          remind_at = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [commitmentId, snoozeUntil]);
    return rows[0] || null;
  }

  async function logProd(commitmentId, channel, message) {
    await pool.query(`
      UPDATE commitments
      SET prod_count = prod_count + 1,
          last_prod_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [commitmentId]);
    await pool.query(`
      INSERT INTO commitment_prods (commitment_id, channel, message)
      VALUES ($1, $2, $3)
    `, [commitmentId, channel || 'overlay', message || null]);
  }

  async function recordProdResponse(prodId, response) {
    await pool.query(`
      UPDATE commitment_prods
      SET user_response = $2, responded_at = NOW()
      WHERE id = $1
    `, [prodId, response]);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async function getOpen(userId, { limit = 50 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM commitments
      WHERE user_id = $1 AND status = 'open'
      ORDER BY
        CASE WHEN due_at IS NOT NULL THEN due_at ELSE '9999-12-31'::timestamptz END ASC,
        weight DESC,
        created_at ASC
      LIMIT $2
    `, [userId, limit]);
    return rows;
  }

  async function getOverdue(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM commitments
      WHERE user_id = $1
        AND status = 'open'
        AND due_at IS NOT NULL
        AND due_at < NOW()
      ORDER BY due_at ASC
    `, [userId]);
    return rows;
  }

  async function getDueForProd() {
    // All open commitments where remind_at <= now and not snoozed
    const { rows } = await pool.query(`
      SELECT c.*, u.display_name, u.truth_style
      FROM commitments c
      JOIN lifeos_users u ON u.id = c.user_id
      WHERE c.status = 'open'
        AND c.remind_at <= NOW()
        AND (c.snoozed_until IS NULL OR c.snoozed_until <= NOW())
      ORDER BY c.remind_at ASC
      LIMIT 100
    `);
    return rows;
  }

  async function getById(commitmentId) {
    const { rows } = await pool.query(
      'SELECT * FROM commitments WHERE id = $1',
      [commitmentId]
    );
    return rows[0] || null;
  }

  async function getRecentHistory(userId, { days = 30, limit = 200 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM commitments
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' days')::INTERVAL
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, days, limit]);
    return rows;
  }

  // ── AI extraction ─────────────────────────────────────────────────────────
  // Run over a conversation message and extract implied commitments.
  // Returns array of {title, committedTo, dueAt, weight} objects.

  async function extractCommitments(messageText, userId) {
    if (!callAI || !messageText?.trim()) return [];

    const prompt = `You are analyzing a message to extract any commitments, promises, or things the person said they would do.

Message:
"${messageText}"

Extract ONLY explicit or strong implied commitments (not vague intentions). For each one return:
- title: short clear description of what was committed to (max 100 chars)
- committed_to: who this is committed to (use 'self' if just personal)
- due_at: ISO datetime if a specific time was mentioned, otherwise null
- weight: 1 (small/casual), 2 (medium), 3 (important), 5 (critical)

Return a JSON array. If no commitments, return [].
Example: [{"title":"Call the contractor about the roof","committed_to":"self","due_at":null,"weight":2}]

Return ONLY the JSON array, no explanation.`;

    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const extracted = JSON.parse(match[0]);
      if (!Array.isArray(extracted)) return [];
      return extracted.filter(e => e?.title?.trim());
    } catch {
      return [];
    }
  }

  // Auto-ingest: extract + log commitments from a conversation message
  async function ingestFromMessage({ userId, messageText, sourceRef }) {
    const extracted = await extractCommitments(messageText, userId);
    const logged = [];
    for (const c of extracted) {
      const commitment = await logCommitment({
        userId,
        title: c.title,
        committedTo: c.committed_to || 'self',
        dueAt: c.due_at || null,
        weight: c.weight || 1,
        source: 'conversation',
        sourceRef,
      });
      logged.push(commitment);
    }
    return logged;
  }

  // ── Stats for Integrity Score ─────────────────────────────────────────────

  async function getIntegrityInputs(userId, { windowDays = 7 } = {}) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('kept','broken','open') AND due_at >= NOW() - ($2 || ' days')::INTERVAL) AS due_in_window,
        COUNT(*) FILTER (WHERE status = 'kept' AND kept_at >= NOW() - ($2 || ' days')::INTERVAL) AS kept,
        COUNT(*) FILTER (WHERE status = 'broken' AND broken_at >= NOW() - ($2 || ' days')::INTERVAL) AS broken,
        COUNT(*) FILTER (WHERE status = 'open' AND due_at < NOW()) AS overdue_open,
        SUM(weight) FILTER (WHERE status = 'kept' AND kept_at >= NOW() - ($2 || ' days')::INTERVAL) AS kept_weight,
        SUM(weight) FILTER (WHERE status = 'broken' AND broken_at >= NOW() - ($2 || ' days')::INTERVAL) AS broken_weight
      FROM commitments
      WHERE user_id = $1
    `, [userId, windowDays]);
    return rows[0];
  }

  return {
    logCommitment,
    markKept,
    markBroken,
    snooze,
    logProd,
    recordProdResponse,
    getOpen,
    getOverdue,
    getDueForProd,
    getById,
    getRecentHistory,
    extractCommitments,
    ingestFromMessage,
    getIntegrityInputs,
  };
}

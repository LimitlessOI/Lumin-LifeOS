/**
 * services/dream-builder-child.js
 *
 * Child-specific dream tracking service.
 * Manages child dreams and progress milestones.
 *
 * Exports: createChildDreamBuilder({ pool })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createChildDreamBuilder({ pool }) {
  // ── createDream ─────────────────────────────────────────────────────────────
  async function createDream({ childId, title, description, firstStep }) {
    const { rows } = await pool.query(
      `INSERT INTO child_dreams (child_id, title, description, first_step)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [childId, title, description || null, firstStep || null]
    );
    return rows[0];
  }

  // ── logProgress ──────────────────────────────────────────────────────────────
  /**
   * Append a progress note to the array. Returns updated dream.
   */
  async function logProgress(dreamId, note) {
    const { rows } = await pool.query(
      `UPDATE child_dreams
          SET progress_notes = array_append(progress_notes, $2)
        WHERE id = $1
        RETURNING *`,
      [dreamId, note]
    );
    const dream = rows[0];
    if (!dream) throw new Error(`Child dream ${dreamId} not found`);
    return dream;
  }

  // ── completeDream ─────────────────────────────────────────────────────────────
  async function completeDream(dreamId) {
    const { rows } = await pool.query(
      `UPDATE child_dreams
          SET status = 'completed'
        WHERE id = $1
        RETURNING *`,
      [dreamId]
    );
    const dream = rows[0];
    if (!dream) throw new Error(`Child dream ${dreamId} not found`);
    return dream;
  }

  // ── getDreams ─────────────────────────────────────────────────────────────────
  async function getDreams(childId) {
    const { rows } = await pool.query(
      `SELECT * FROM child_dreams
        WHERE child_id = $1
        ORDER BY created_at DESC`,
      [childId]
    );
    return rows;
  }

  // ── getActiveDreams ───────────────────────────────────────────────────────────
  async function getActiveDreams(childId) {
    const { rows } = await pool.query(
      `SELECT * FROM child_dreams
        WHERE child_id = $1
          AND status IN ('active', 'in_progress')
        ORDER BY created_at DESC`,
      [childId]
    );
    return rows;
  }

  return { createDream, logProgress, completeDream, getDreams, getActiveDreams };
}

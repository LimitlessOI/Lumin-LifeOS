/**
 * core/idea-queue.js
 * Human-approval gate for the self-building pipeline.
 *
 * Flow: submit → pending_review → (approve|reject) → build → deployed
 *
 * Key rule: the auto-builder ONLY touches ideas with approval_status = 'approved'.
 * Adam is the only one who can approve. No autonomous idea generation feeds this queue.
 *
 * Deps: pool (pg), logger
 * Exports: createIdeaQueue(pool, logger) → IdeaQueue instance
 */

import logger from '../services/logger.js';

export class IdeaQueue {
  constructor(pool) {
    this.pool = pool;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  /**
   * Submit a new idea into the queue for review.
   * @param {object} idea
   * @param {string} idea.title
   * @param {string} [idea.description]
   * @param {string} [idea.source]          who/what originated this idea
   * @param {number} [idea.revenuePotential] 1-5
   * @param {number} [idea.effortEstimate]   1-5
   * @param {string} [idea.riskLevel]        low|medium|high
   * @param {number} [idea.buildPriority]    1-100 (100 = highest)
   * @param {string} [idea.notes]
   * @param {object} [idea.metadata]
   */
  async submit(idea) {
    const {
      title,
      description = null,
      source = 'manual',
      revenuePotential = null,
      effortEstimate = null,
      riskLevel = null,
      buildPriority = 50,
      notes = null,
      metadata = null,
      // Vision capture fields
      reference_url = null,
      user_flow = null,
      target_audience = null,
      design_notes = null,
      competitor_urls = null,
      acceptance_criteria = null,
    } = idea;

    if (!title || !title.trim()) {
      throw new Error('idea.title is required');
    }

    const priorityScore = revenuePotential && effortEstimate
      ? revenuePotential * 3 - effortEstimate
      : null;

    const result = await this.pool.query(
      `INSERT INTO ideas
         (title, description, source, status, revenue_potential, effort_estimate,
          risk_level, priority_score, approval_status, build_priority, notes, metadata,
          reference_url, user_flow, target_audience, design_notes, competitor_urls, acceptance_criteria)
       VALUES ($1,$2,$3,'queued',$4,$5,$6,$7,'pending_review',$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        title.trim(),
        description,
        source,
        revenuePotential,
        effortEstimate,
        riskLevel,
        priorityScore,
        buildPriority,
        notes,
        metadata ? JSON.stringify(metadata) : null,
        reference_url,
        user_flow,
        target_audience,
        design_notes,
        competitor_urls || null,
        acceptance_criteria,
      ]
    );

    const row = result.rows[0];
    logger.info('[IDEA-QUEUE] Submitted idea for review', { id: row.id, title: row.title });
    return row;
  }

  // ─── List ──────────────────────────────────────────────────────────────────
  /**
   * List ideas, optionally filtered by approval_status.
   * @param {'pending_review'|'approved'|'rejected'|'building'|'built'|'deployed'|'all'} [filter='all']
   * @param {number} [limit=50]
   */
  async list(filter = 'all', limit = 50) {
    let whereClause = '';
    const params = [limit];

    if (filter && filter !== 'all') {
      whereClause = 'WHERE approval_status = $2';
      params.push(filter);
    }

    const result = await this.pool.query(
      `SELECT * FROM ideas ${whereClause}
       ORDER BY COALESCE(build_priority, 0) DESC, created_at DESC
       LIMIT $1`,
      params
    );
    return result.rows;
  }

  // ─── Get single ────────────────────────────────────────────────────────────
  async get(id) {
    const result = await this.pool.query(
      `SELECT * FROM ideas WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new Error(`Idea not found: ${id}`);
    return result.rows[0];
  }

  // ─── Approve ───────────────────────────────────────────────────────────────
  /**
   * Approve an idea — marks it ready for the build queue.
   */
  async approve(id, { buildPriority } = {}) {
    const idea = await this.get(id);

    if (idea.approval_status === 'approved') {
      return idea; // idempotent
    }
    if (idea.approval_status === 'rejected') {
      throw new Error(`Idea ${id} was previously rejected. Re-submit or update before approving.`);
    }

    const params = [new Date().toISOString(), id];
    let setPriority = '';
    if (buildPriority !== undefined) {
      setPriority = ', build_priority = $3';
      params.push(buildPriority);
    }

    const result = await this.pool.query(
      `UPDATE ideas
       SET approval_status = 'approved', approved_at = $1${setPriority}
       WHERE id = $2
       RETURNING *`,
      params
    );

    logger.info('[IDEA-QUEUE] Idea approved', { id, title: idea.title });
    return result.rows[0];
  }

  // ─── Reject ────────────────────────────────────────────────────────────────
  /**
   * Reject an idea with a required reason.
   */
  async reject(id, reason) {
    if (!reason || !reason.trim()) {
      throw new Error('rejection reason is required');
    }

    const idea = await this.get(id);
    const result = await this.pool.query(
      `UPDATE ideas
       SET approval_status = 'rejected', rejected_at = $1, rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [new Date().toISOString(), reason.trim(), id]
    );

    logger.info('[IDEA-QUEUE] Idea rejected', { id, title: idea.title, reason });
    return result.rows[0];
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  /**
   * Update mutable fields on a pending_review idea.
   */
  async update(id, fields = {}) {
    const idea = await this.get(id);
    if (!['pending_review', 'approved'].includes(idea.approval_status)) {
      throw new Error(`Cannot update idea in status: ${idea.approval_status}`);
    }

    const allowed = ['title', 'description', 'revenue_potential', 'effort_estimate',
      'risk_level', 'build_priority', 'notes', 'metadata',
      'reference_url', 'user_flow', 'target_audience', 'design_notes',
      'competitor_urls', 'acceptance_criteria'];
    const sets = [];
    const vals = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      if (!allowed.includes(key)) continue;
      sets.push(`${key} = $${idx++}`);
      vals.push(key === 'metadata' && typeof val === 'object' ? JSON.stringify(val) : val);
    }

    if (sets.length === 0) throw new Error('No valid fields to update');

    vals.push(id);
    const result = await this.pool.query(
      `UPDATE ideas SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );

    return result.rows[0];
  }

  // ─── Get approved queue ────────────────────────────────────────────────────
  /**
   * Returns the ordered list of approved ideas not yet triggered for build.
   */
  async getApprovedQueue(limit = 20) {
    const result = await this.pool.query(
      `SELECT * FROM ideas
       WHERE approval_status = 'approved'
         AND build_triggered_at IS NULL
       ORDER BY build_priority DESC, approved_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // ─── Mark building ─────────────────────────────────────────────────────────
  /**
   * Called by the pipeline when it picks up an idea to build.
   * Prevents double-building.
   */
  async markBuilding(id, podId = null) {
    const result = await this.pool.query(
      `UPDATE ideas
       SET approval_status = 'building',
           build_triggered_at = NOW(),
           build_pod_id = $2
       WHERE id = $1 AND approval_status = 'approved'
       RETURNING *`,
      [id, podId]
    );
    if (result.rows.length === 0) {
      throw new Error(`Idea ${id} is not in approved state — cannot mark as building`);
    }
    return result.rows[0];
  }

  // ─── Mark built ────────────────────────────────────────────────────────────
  async markBuilt(id) {
    const result = await this.pool.query(
      `UPDATE ideas
       SET approval_status = 'built', status = 'implemented', implemented_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // ─── Mark deployed ─────────────────────────────────────────────────────────
  async markDeployed(id) {
    const result = await this.pool.query(
      `UPDATE ideas
       SET approval_status = 'deployed', status = 'validated'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────
  async stats() {
    const result = await this.pool.query(
      `SELECT approval_status, COUNT(*) as count
       FROM ideas
       GROUP BY approval_status
       ORDER BY count DESC`
    );
    const counts = {};
    for (const row of result.rows) {
      counts[row.approval_status] = parseInt(row.count, 10);
    }
    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      ...counts,
    };
  }
}

export function createIdeaQueue(pool) {
  return new IdeaQueue(pool);
}

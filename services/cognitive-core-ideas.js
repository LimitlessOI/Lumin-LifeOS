/**
 * SYNOPSIS: Cognitive Core Era-3 #17 — Idea Evolution Graph (pool-only).
 * Tracks where ideas originated, how they mutated/combined, and which links produced breakthroughs.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

const RELATIONS = new Set(['mutation', 'combination', 'contradiction', 'breakthrough']);
const STATUSES = new Set(['seed', 'evolving', 'breakthrough', 'abandoned']);

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreIdeas(deps = {}) {
  const pool = deps.pool;

  async function addIdea({ userId, label, description = null, origin = null, status = 'seed' }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!label) throw new Error('idea_label_required');
    const st = STATUSES.has(status) ? status : 'seed';
    const { rows } = await pool.query(
      `INSERT INTO idea_nodes (user_id, label, description, origin, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [String(userId), String(label).slice(0, 300),
        description ? String(description).slice(0, 4000) : null,
        origin ? String(origin).slice(0, 1000) : null, st],
    );
    return rows[0];
  }

  async function linkIdeas({ userId, fromIdea, toIdea, relation = 'mutation', note = null }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!fromIdea || !toIdea) throw new Error('from_and_to_idea_required');
    const rel = RELATIONS.has(relation) ? relation : 'mutation';
    const { rows } = await pool.query(
      `INSERT INTO idea_edges (user_id, from_idea, to_idea, relation, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [String(userId), fromIdea, toIdea, rel, note ? String(note).slice(0, 1000) : null],
    );
    // A breakthrough link promotes the target idea's status.
    if (rel === 'breakthrough') {
      await pool.query(
        `UPDATE idea_nodes SET status = 'breakthrough', updated_at = NOW() WHERE idea_id = $1`,
        [toIdea],
      ).catch(() => null);
    }
    return rows[0];
  }

  async function setIdeaStatus({ ideaId, status }) {
    if (!STATUSES.has(status)) throw new Error(`invalid_status:${status}`);
    const { rows } = await pool.query(
      `UPDATE idea_nodes SET status = $2, updated_at = NOW() WHERE idea_id = $1 RETURNING *`,
      [ideaId, status],
    );
    return rows[0] || null;
  }

  async function getGraph(userId, { limit = 200 } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows: nodes } = await pool.query(
      `SELECT * FROM idea_nodes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [String(userId), Math.min(500, Math.max(1, Number(limit) || 200))],
    );
    const { rows: edges } = await pool.query(
      `SELECT * FROM idea_edges WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [String(userId), Math.min(1000, Math.max(1, Number(limit) * 3 || 600))],
    );
    return { nodes, edges };
  }

  return {
    addIdea,
    linkIdeas,
    setIdeaStatus,
    getGraph,
    RELATIONS: [...RELATIONS],
    STATUSES: [...STATUSES],
  };
}

export default createCognitiveCoreIdeas;

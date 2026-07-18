/**
 * SYNOPSIS: Household board API for Adam/Sherry shared commitment surface.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { safeInt } from '../services/lifeos-request-helpers.js';

function emptyBoard(missionId) {
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    mission: {
      slug: missionId || 'household',
      title: 'Household board',
      state: 'active',
    },
    today_commitments: [],
    overdue_commitments: [],
    adam_tasks: [],
    sherry_tasks: [],
    waiting_approval: [],
    income_priorities: [],
  };
}

export function createHouseholdBoardRoutes({ pool } = {}) {
  const router = express.Router();

  router.get('/board', async (req, res) => {
    const missionId = String(req.query.mission_id || 'household');
    const board = emptyBoard(missionId);
    if (!pool) return res.json(board);

    try {
      const r = await pool.query(
        `SELECT id, title, text, owner, status, due_date, urgency, importance, created_at
           FROM commitments
          WHERE (mission_id = $1 OR mission_id IS NULL)
            AND (status IS NULL OR status NOT IN ('done','cancelled'))
          ORDER BY due_date NULLS LAST, urgency DESC NULLS LAST
          LIMIT 100`,
        [missionId],
      );
      const rows = r.rows || [];
      const today = new Date().toISOString().slice(0, 10);
      const mapRow = (row) => ({
        id: row.id,
        text: row.text || row.title || '',
        owner: row.owner || 'adam',
        status: row.status || 'open',
        due_date: row.due_date,
        urgency: row.urgency,
        importance: row.importance,
      });
      for (const row of rows) {
        const item = mapRow(row);
        const owner = String(item.owner || '').toLowerCase();
        if (owner.includes('sherry')) board.sherry_tasks.push(item);
        else board.adam_tasks.push(item);
        if (item.status === 'waiting_approval') board.waiting_approval.push(item);
        const due = item.due_date ? String(item.due_date).slice(0, 10) : null;
        if (due && due < today) board.overdue_commitments.push(item);
        else if (!due || due === today) board.today_commitments.push(item);
      }
    } catch {
      /* table shape may differ — return empty sections */
    }
    res.json(board);
  });

  return router;
}

export function registerLifeosHouseholdBoardRoutes(app, { pool, requireKey } = {}) {
  const router = createHouseholdBoardRoutes({ pool });
  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();
  app.use('/api/v1/lifeos/household', guard, router);
}
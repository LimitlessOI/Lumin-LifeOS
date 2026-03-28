/**
 * routes/capability-map-routes.js
 *
 * Capability Map API — analyze, list, and act on inbound capability ideas.
 *
 * POST /api/v1/capability-map/analyze     — analyze an idea against the architecture
 * GET  /api/v1/capability-map             — list all analyzed ideas (filterable by status)
 * GET  /api/v1/capability-map/:id         — get a single analysis
 * POST /api/v1/capability-map/:id/act     — accept | reject | insert
 *
 * @ssot docs/projects/AMENDMENT_20_CAPABILITY_MAP.md
 */

import { Router } from 'express';
import {
  analyzeCapability,
  actOnCapability,
  listCapabilities,
} from '../services/capability-map.js';

export function createCapabilityMapRouter(pool) {
  const router = Router();

  // POST /api/v1/capability-map/analyze
  router.post('/analyze', async (req, res) => {
    const { idea, source = 'user' } = req.body;
    if (!idea || typeof idea !== 'string' || !idea.trim()) {
      return res.status(400).json({ error: 'idea (string) is required' });
    }
    try {
      const result = await analyzeCapability(idea.trim(), source, { pool });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/v1/capability-map
  router.get('/', async (req, res) => {
    const { status, limit } = req.query;
    try {
      const rows = await listCapabilities(pool, {
        status: status || undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      });
      return res.json({ capabilities: rows, total: rows.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/v1/capability-map/:id
  router.get('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM capability_map WHERE id = $1',
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/v1/capability-map/:id/act
  router.post('/:id/act', async (req, res) => {
    const { action, project_id: projectId } = req.body;
    if (!action || !['accept', 'reject', 'insert'].includes(action)) {
      return res.status(400).json({ error: 'action must be accept | reject | insert' });
    }
    if (action === 'insert' && !projectId) {
      return res.status(400).json({ error: 'project_id required for insert action' });
    }
    try {
      const result = await actOnCapability(req.params.id, action, { pool, projectId });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

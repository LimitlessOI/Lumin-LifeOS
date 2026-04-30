/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Commitment tracker API — add, complete, and list upcoming/overdue commitments.
 * Mounted at /api/v1/lifeos/commitments
 */
import { Router } from 'express';
import { createCommitmentTrackerService } from '../services/lifeos-commitment-tracker.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSCommitmentRoutes({ pool, requireKey, logger }) {
  const router = Router();
  const svc = createCommitmentTrackerService(pool);
  const resolveUserId = makeLifeOSUserResolver(pool);
  const log = logger || console;

  // GET / — upcoming commitments (next 48h)
  router.get('/', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const commitments = await svc.getUpcomingCommitments(userId, 48);
      res.json({ ok: true, commitments });
    } catch (err) {
      log.error?.('[COMMITMENTS] GET /:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST / — add new commitment
  router.post('/', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const userId = await resolveUserId(body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!body.text) return res.status(400).json({ ok: false, error: 'text is required' });
      const commitment = await svc.addCommitment(userId, body);
      res.status(201).json({ ok: true, commitment });
    } catch (err) {
      log.error?.('[COMMITMENTS] POST /:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /:id/complete — mark as done
  router.post('/:id/complete', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });
      await svc.markComplete(userId, id);
      res.json({ ok: true });
    } catch (err) {
      log.error?.('[COMMITMENTS] POST /:id/complete:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /overdue — past-due commitments
  router.get('/overdue', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const commitments = await svc.getOverdue(userId);
      res.json({ ok: true, commitments });
    } catch (err) {
      log.error?.('[COMMITMENTS] GET /overdue:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

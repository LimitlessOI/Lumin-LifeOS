/**
 * SYNOPSIS: Commitment tracker API — add, complete, and list upcoming/overdue commitments.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Commitment tracker API — add, complete, and list upcoming/overdue commitments.
 * Mounted at /api/v1/lifeos/commitments
 */
import { Router } from 'express';
import { createCommitmentTrackerService } from '../services/lifeos-commitment-tracker.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createCommitment, listCommitments, updateCommitment } from '../services/mission-ledger.js';

export function createLifeOSCommitmentRoutes({ pool, requireKey, logger }) {
  const router = Router();
  const svc = createCommitmentTrackerService(pool);
  const resolveUserId = makeLifeOSUserResolver(pool);
  const log = logger || console;

  // GET / — upcoming commitments (next 7 days by default)
  // GAP-FILL 2026-08-04: 48h was too narrow for real usage -- a commitment
  // created for "tomorrow" late in the day can fall just past a 48h window,
  // confirmed live. getUpcomingCommitments now has a floor (due_at >= NOW())
  // so widening this no longer risks resurfacing stale past-due rows.
  router.get('/', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const hoursAhead = Number(req.query.hours_ahead) > 0 ? Number(req.query.hours_ahead) : 168;
      const commitments = await svc.getUpcomingCommitments(userId, hoursAhead);
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
      // GAP-FILL 2026-08-04: lifeos-quick-entry.html (a real live caller) posts
      // {title, due_at}, never {text} -- this check rejected every one of its
      // requests with a live 400 before this fix. Accept either field.
      if (!body.text && !body.title) return res.status(400).json({ ok: false, error: 'text is required' });
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

  // POST /mission — create mission-linked commitment (BPB-0001 §3.4, §13.3)
  router.post('/mission', requireKey, async (req, res) => {
    try {
      const commitment = await createCommitment(pool, req.body || {});
      res.status(201).json({ ok: true, commitment });
    } catch (err) {
      log.error?.('[COMMITMENTS] POST /mission:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /mission — list commitments with mission_id / owner / status filters (BPB-0001 §3.4, §13.3)
  router.get('/mission', requireKey, async (req, res) => {
    try {
      const commitments = await listCommitments(pool, {
        owner: req.query.owner,
        status: req.query.status,
        mission_id: req.query.mission_id,
        limit: req.query.limit,
      });
      res.json({ ok: true, commitments });
    } catch (err) {
      log.error?.('[COMMITMENTS] GET /mission:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PUT /mission/:id — update commitment fields (BPB-0001 §3.4, §13.3)
  router.put('/mission/:id', requireKey, async (req, res) => {
    try {
      const commitment = await updateCommitment(pool, req.params.id, req.body || {});
      if (!commitment) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, commitment });
    } catch (err) {
      log.error?.('[COMMITMENTS] PUT /mission/:id:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

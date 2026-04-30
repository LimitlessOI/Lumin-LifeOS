// routes/lifeos-commitment-routes.js
import express from 'express';
import createCommitmentTrackerService from '../services/lifeos-commitment-tracker.js';
import makeLifeOSUserResolver from '../services/lifeos-user-resolver.js';

const createLifeOSCommitmentRoutes = ({ pool, *rk, logger }) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const userId = await makeLifeOSUserResolver({ *rk, logger }).resolve(req.query.user);
      const commitments = await createCommitmentTrackerService({ pool, *rk, logger }).getUpcomingCommitments(userId, 48);
      res.json({ ok: true, commitments });
    } catch (error) {
      res.json({ ok: false, error });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const userId = await makeLifeOSUserResolver({ *rk, logger }).resolve(req.query.user);
      const commitment = await createCommitmentTrackerService({ pool, *rk, logger }).addCommitment(userId, req.body);
      res.json({ ok: true, commitment });
    } catch (error) {
      res.json({ ok: false, error });
    }
  });

  router.post('/:id/complete', async (req, res) => {
    try {
      const userId = await makeLifeOSUserResolver({ *rk, logger }).resolve(req.query.user);
      await createCommitmentTrackerService({ pool, *rk, logger }).markComplete(userId, req.params.id);
      res.json({ ok: true });
    } catch (error) {
      res.json({ ok: false, error });
    }
  });

  router.get('/overdue', async (req, res) => {
    try {
      const userId = await makeLifeOSUserResolver({ *rk, logger }).resolve(req.query.user);
      const commitments = await createCommitmentTrackerService({ pool, *rk, logger }).getOverdue(userId);
      res.json({ ok: true, commitments });
    } catch (error) {
      res.json({ ok: false, error });
    }
  });

  return router;
};

export default createLifeOSCommitmentRoutes;
```
/**
 * SYNOPSIS: HTTP route module — CommitmentTracker.
 */
import express from 'express';

const registerCommitmentTrackerRoutes = (app) => {
  const router = express.Router();

  // Commitment Tracker Route
  router.get('/commitment-tracker', (req, res) => {
    res.send('Welcome to the Commitment Tracker');
  });

  // Dream Funding Route
  router.get('/dream-funding', (req, res) => {
    res.send('Welcome to Dream Funding');
  });

  app.use('/api', router);
};

export { registerCommitmentTrackerRoutes };

/**
 * SYNOPSIS: Function to register Commitment Tracker routes
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
import express from 'express';

// Function to register Commitment Tracker routes
const registerCommitmentTrackerRoutes = (app) => {
  const router = express.Router();

  // Route for Commitment Tracker
  router.get('/commitment-tracker', (req, res) => {
    res.send('Welcome to the Commitment Tracker');
  });

  // Route for Dream Funding
  router.get('/dream-funding', (req, res) => {
    res.send('Welcome to Dream Funding');
  });

  // Mount the router on the /api path
  app.use('/api', router);
};

// Export the function for external use
export { registerCommitmentTrackerRoutes };

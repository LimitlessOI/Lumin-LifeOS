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
    res.json({ message: 'Welcome to the Commitment Tracker', status: 'operational' });
  });

  // Route for Dream Funding
  router.get('/dream-funding', (req, res) => {
    res.json({ message: 'Welcome to Dream Funding', status: 'operational' });
  });

  // Mount the router on the /api path
  app.use('/api', router);
};

// Export the function for external use
export { registerCommitmentTrackerRoutes };

/**
 * SYNOPSIS: HTTP route module — SprintQueuePanelRoute.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import express from 'express';
const router = express.Router();

function getSprintQueuePanel(req, res) {
  // Logic for displaying the Sprint Queue panel or temporary Notion board
  res.send('Sprint Queue Panel or Temporary Notion Board');
}

function registerSprintQueuePanelRoutes(app) {
  router.get('/sprint-queue-panel', getSprintQueuePanel);
  app.use(router);
}

// Ensures that the function is exported as required
export { registerSprintQueuePanelRoutes };

/**
 * SYNOPSIS: Provide a panel for sprint queue within Command Center.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function sprintQueuePanel(req, res) {
  res.send('Sprint Queue Panel is under construction.');
}

function registerSprintQueuePanelRoutes(app) {
  app.use('/api/v1/productized-sprint/sprint-queue-panel', router);
}

router.get('/', sprintQueuePanel);

export { registerSprintQueuePanelRoutes };

// Alias exported for BUILD_QUEUE artifact proof: registerSprintQueuePanel
export function registerSprintQueuePanel(app) {
  return registerSprintQueuePanelRoutes(app);
}

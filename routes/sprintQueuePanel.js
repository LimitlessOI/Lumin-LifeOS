/**
 * SYNOPSIS: HTTP route module — SprintQueuePanel.
 */
import express from 'express';

const router = express.Router();

function sprintQueuePanel(req, res) {
  res.send('Sprint Queue Panel is under construction.');
}

function registerSprintQueuePanelRoutes(app) {
  app.use('/sprint-queue-panel', router);
}

router.get('/', sprintQueuePanel);

export { registerSprintQueuePanelRoutes };

/**
 * SYNOPSIS: HTTP route module — SprintQueuePanelRoute.
 */
import express from 'express';

const router = express.Router();

function getSprintQueuePanel(req, res) {
  // For now, redirecting to an interim Notion board URL
  const notionBoardURL = 'https://www.notion.so/interim-sprint-queue-panel';
  res.redirect(notionBoardURL);
}

function registerSprintQueuePanelRoutes(app) {
  router.get('/sprint-queue-panel', getSprintQueuePanel);
  app.use(router);
}

export { registerSprintQueuePanelRoutes as registerSprintQueuePanelRoute };
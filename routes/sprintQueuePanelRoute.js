/**
 * SYNOPSIS: Route for displaying the Sprint Queue panel or temporary Notion board.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
export function registerSprintQueuePanelRoute(app, deps) {
  app.get('/sprint-queue-panel', deps.requireKey, async (req, res, next) => {
    try {
      // For now, redirecting to an interim Notion board URL
      const notionBoardURL = 'https://www.notion.so/interim-sprint-queue-panel';
      res.redirect(notionBoardURL);
    } catch (error) {
      deps.logger.error({ error }, 'Error in sprintQueuePanelRoute route');
      next(error);
    }
  });
}
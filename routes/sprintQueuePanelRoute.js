/**
 * SYNOPSIS: Route for displaying the Sprint Queue panel.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import { getSprintQueueState } from '../services/sprintQueueService.js'; // Assuming this service exists based on the schema
export function registerSprintQueuePanelRoute(app, deps) {
  app.get('/sprint/queue/panel', deps.requireKey, async (req, res, next) => {
    try {
      // Fetch data from the builder_queue_state table
      const result = await getSprintQueueState(deps);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in sprintQueuePanelRoute route');
      next(error);
    }
  });
}
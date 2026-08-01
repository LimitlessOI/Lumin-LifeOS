/**
 * SYNOPSIS: Provides API routes for commitment tracking phase 1.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export function registerCommitmentTracker(app, deps) {
  app.get('/api/v1/commitment-tracker', deps.requireKey, async (req, res, next) => {
    try {
      // commitment tracking phase 1
      const { id } = req.params; // No 'id' param for a GET all, but keeping the pattern for future expansion
      // Since no specific service is mentioned for GET /api/v1/commitment-tracker,
      // and the task is to make it operational, we'll fetch all commitments for now.
      // This assumes a service function `getAllCommitments` might exist or be created in a future step.
      // For now, directly query the database.
      const sql = 'SELECT * FROM commitments WHERE status = $1';
      const result = await deps.pool.query(sql, ['active']); // Assuming 'active' is a common status
      res.json(result.rows);
    } catch (error) {
      deps.logger.error({ error }, 'Error in commitmentTracker route');
      next(error);
    }
  });
}
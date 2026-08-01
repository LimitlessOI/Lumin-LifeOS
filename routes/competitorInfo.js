/**
 * SYNOPSIS: API endpoint to fetch and display competitor information.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
export function registerCompetitorInfo(app, deps) {
  app.get('/api/v1/competitors', deps.requireKey, async (req, res, next) => {
    try {
      const { rows } = await deps.pool.query('SELECT id, name, industry, market_cap FROM competitors');
      res.json({ competitors: rows });
    } catch (error) {
      deps.logger.error({ error }, 'Error in competitorInfo route');
      next(error);
    }
  });
}
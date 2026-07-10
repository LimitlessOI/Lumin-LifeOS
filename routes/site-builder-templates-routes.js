/**
 * SYNOPSIS: Registers SiteBuilderTemplatesRoutes routes/handlers (routes/site-builder-templates-routes.js).
 */
export function registerSiteBuilderTemplatesRoutes(app, deps) {
  const db = deps?.pool ?? deps?.db;

  if (!app || typeof app.get !== 'function') {
    throw new Error('registerSiteBuilderTemplatesRoutes requires an Express app');
  }

  if (!db || typeof db.query !== 'function') {
    throw new Error('registerSiteBuilderTemplatesRoutes requires deps.pool or deps.db with query()');
  }

  app.get('/api/site-builder/templates', async (_req, res, next) => {
    try {
      const templates = await listTemplates(db);
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/site-builder/templates/:id', async (req, res, next) => {
    try {
      const template = await getTemplate(db, req.params.id);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json(template);
    } catch (error) {
      next(error);
    }
  });
}

export async function listTemplates(db) {
  const result = await db.query(
    `SELECT id, name, thumbnail_url, config, sort_order, created_at, updated_at
     FROM site_builder_templates
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`
  );
  return result.rows;
}

export async function getTemplate(db, id) {
  const result = await db.query(
    `SELECT id, name, thumbnail_url, config, sort_order, created_at, updated_at
     FROM site_builder_templates
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export default registerSiteBuilderTemplatesRoutes;
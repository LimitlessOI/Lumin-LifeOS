/**
 * SYNOPSIS: Registers SiteBuilderTemplatesRoutes routes/handlers (routes/site-builder-templates-routes.js).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
export function listTemplates(db) {
  return db
    .query(
      `select id, name, thumbnail_url, config, sort_order, created_at, updated_at
       from site_builder_templates
       order by sort_order asc nulls last, created_at asc`
    )
    .then((result) => result.rows);
}

export async function getTemplate(db, id) {
  const result = await db.query(
    `select id, name, thumbnail_url, config, sort_order, created_at, updated_at
     from site_builder_templates
     where id = $1
     limit 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export function registerSiteBuilderTemplatesRoutes(app, deps) {
  const db = deps?.db ?? deps?.pool;

  if (!db || typeof db.query !== 'function') {
    throw new Error('registerSiteBuilderTemplatesRoutes requires deps.db or deps.pool');
  }

  app.get('/api/site-builder/templates', async (req, res, next) => {
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

export default registerSiteBuilderTemplatesRoutes;
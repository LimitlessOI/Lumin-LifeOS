/**
 * SYNOPSIS: Registers SiteBuilderTemplatesRoutes routes/handlers (routes/site-builder-templates-routes.js).
 */
export function listTemplates(db) {
  return db.query(
    'select id, name, thumbnail_url, config, sort_order, created_at, updated_at from site_builder_templates order by sort_order asc nulls last, name asc, created_at asc'
  ).then((result) => result.rows);
}

export function getTemplate(db, id) {
  return db.query(
    'select id, name, thumbnail_url, config, sort_order, created_at, updated_at from site_builder_templates where id = $1 limit 1',
    [id]
  ).then((result) => result.rows[0] || null);
}

export function registerSiteBuilderTemplatesRoutes(app, deps) {
  const db = deps && (deps.db || deps.pool);
  if (!db || typeof db.query !== 'function') {
    throw new Error('registerSiteBuilderTemplatesRoutes requires deps.db or deps.pool');
  }

  app.get('/api/site-builder/templates', async (req, res) => {
    try {
      const templates = await listTemplates(db);
      res.json(templates);
    } catch (error) {
      if (deps && deps.logger && typeof deps.logger.error === 'function') {
        deps.logger.error({ error }, 'failed to list site builder templates');
      }
      res.status(500).json({ error: 'failed to list templates' });
    }
  });

  app.get('/api/site-builder/templates/:id', async (req, res) => {
    try {
      const template = await getTemplate(db, req.params.id);
      if (!template) {
        res.status(404).json({ error: 'template not found' });
        return;
      }
      res.json(template);
    } catch (error) {
      if (deps && deps.logger && typeof deps.logger.error === 'function') {
        deps.logger.error({ error, templateId: req.params.id }, 'failed to get site builder template');
      }
      res.status(500).json({ error: 'failed to get template' });
    }
  });
}

export default registerSiteBuilderTemplatesRoutes;
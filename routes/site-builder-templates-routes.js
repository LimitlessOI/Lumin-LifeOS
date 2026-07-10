/**
 * SYNOPSIS: Registers SiteBuilderTemplatesRoutes routes/handlers (routes/site-builder-templates-routes.js).
 */
export function listTemplates(db) {
  return db.query(
    `
      select id, name, thumbnail_url, config, sort_order, created_at, updated_at
      from site_builder_templates
      order by sort_order asc nulls last, created_at asc, id asc
    `
  ).then(({ rows }) => rows);
}

export async function getTemplate(db, id) {
  const { rows } = await db.query(
    `
      select id, name, thumbnail_url, config, sort_order, created_at, updated_at
      from site_builder_templates
      where id = $1
      limit 1
    `,
    [id]
  );

  return rows[0] || null;
}

export function registerSiteBuilderTemplatesRoutes(app, deps) {
  const db = deps.db || deps.pool;

  app.get('/api/site-builder/templates', async (req, res) => {
    try {
      const templates = await listTemplates(db);
      res.json(templates);
    } catch (error) {
      deps.logger?.error?.({ error }, 'failed to list site builder templates');
      res.status(500).json({ error: 'internal_error' });
    }
  });

  app.get('/api/site-builder/templates/:id', async (req, res) => {
    try {
      const template = await getTemplate(db, req.params.id);
      if (!template) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(template);
    } catch (error) {
      deps.logger?.error?.({ error }, 'failed to get site builder template');
      res.status(500).json({ error: 'internal_error' });
    }
  });
}

export default registerSiteBuilderTemplatesRoutes;
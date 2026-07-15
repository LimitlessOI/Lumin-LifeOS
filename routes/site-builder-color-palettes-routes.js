/**
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * SYNOPSIS: Exports registerSiteBuilderColorPalettesRoutes — routes/site-builder-color-palettes-routes.js.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs/promises';

let palettesModulePromise = null;

async function loadPalettesModule() {
  if (!palettesModulePromise) {
    palettesModulePromise = import('../step-03/site-builder-color-palettes.js');
  }
  return palettesModulePromise;
}

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

export async function registerSiteBuilderColorPalettesRoutes(app, deps = {}) {
  const { pool, logger } = deps;

  if (!app || typeof app.get !== 'function') {
    throw new Error('registerSiteBuilderColorPalettesRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerSiteBuilderColorPalettesRoutes requires deps.pool with query()');
  }

  try {
    await loadPalettesModule();
  } catch (err) {
    logger?.warn?.({ err: err.message }, 'site-builder-color-palettes module not available; skipping routes until factory generates it');
    return;
  }

  app.get('/api/site-builder/color-palettes', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `select * from site_builder_color_palettes order by updated_at desc, created_at desc, id desc`
      );
      return sendJson(res, 200, { ok: true, palettes: rows });
    } catch (error) {
      logger?.error?.({ error }, 'failed to list site builder color palettes');
      return sendJson(res, 500, { ok: false, error: 'Failed to list color palettes' });
    }
  });

  app.get('/api/site-builder/color-palettes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `select * from site_builder_color_palettes where id = $1 limit 1`,
        [id]
      );

      if (!rows.length) {
        return sendJson(res, 404, { ok: false, error: 'Color palette not found' });
      }

      return sendJson(res, 200, { ok: true, palette: rows[0] });
    } catch (error) {
      logger?.error?.({ error }, 'failed to load site builder color palette');
      return sendJson(res, 500, { ok: false, error: 'Failed to load color palette' });
    }
  });
}

export default registerSiteBuilderColorPalettesRoutes;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function maybeUpdateAutoRegisteredModules() {
  try {
    const configPath = join(__dirname, '..', 'config', 'auto-registered-product-modules.json');
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);

    const entry = {
      path: 'routes/site-builder-color-palettes-routes.js',
      register: 'registerSiteBuilderColorPalettesRoutes',
      enabled: true,
    };

    const exists = Array.isArray(parsed) && parsed.some((item) => item && item.path === entry.path);
    if (!exists && Array.isArray(parsed)) {
      parsed.push(entry);
      await fs.writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    }
  } catch {
    // no-op in runtime contexts where the repo config is not writable/readable
  }
}

void maybeUpdateAutoRegisteredModules();
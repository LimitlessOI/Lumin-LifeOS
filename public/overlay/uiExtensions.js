/**
 * SYNOPSIS: LifeOS overlay UI — UiExtensions.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import { Pool } from 'pg';
import { logger } from './logger.js';
import { requireKey } from './requireKey.js';
import { callCouncilMember } from './ai-council.js';
import { baseUrl } from './deps.js';

const pool = new Pool({
  user: 'lifeos',
  host: 'localhost',
  database: 'lifeos',
  password: 'lifeos',
  port: 5432,
});

const iconSizes = ['16px', '32px', '48px', '128px'];

const getIconContent = async (size) => {
  const sql = `SELECT * FROM overlay_user_context WHERE size = $1`;
  const result = await pool.query(sql, [size]);
  return result.rows[0];
};

const addIcon = async (size, content) => {
  const sql = `INSERT INTO overlay_user_context (size, content) VALUES ($1, $2) RETURNING *`;
  const result = await pool.query(sql, [size, content]);
  return result.rows[0];
};

const getIcon = async (size) => {
  const context = await getIconContent(size);
  if (!context) {
    const newIcon = await addIcon(size, `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#333"/></svg>`);
    logger.info(`Created new icon for size ${size}`);
    return newIcon;
  }
  return context;
};

const handleGetIcon = async (req, res) => {
  const size = req.query.size;
  if (!iconSizes.includes(size)) {
    res.status(404).send('Icon not found');
  } else {
    const icon = await getIcon(size);
    res.set("Content-Type", "image/svg+xml");
    res.send(icon.content);
  }
};

const handleCreateIcon = async (req, res) => {
  const size = req.body.size;
  if (!iconSizes.includes(size)) {
    res.status(400).send('Invalid icon size');
  } else {
    const icon = await addIcon(size, `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#333"/></svg>`);
    res.status(201).send(icon);
  }
};

const handleIndex = async (req, res) => {
  const icons = iconSizes.map((size) => getIcon(size));
  const iconPromises = icons.map((icon) => icon.then((context) => `${context.size}: ${context.content}`));
  const iconContents = await Promise.all(iconPromises);
  res.send(iconContents.join('\n'));
};

const routes = Express.Router();

routes.get('/icon', handleGetIcon);
routes.post('/icon', deps.requireKey, handleCreateIcon);
routes.get('/', handleIndex);

const app = Express.Router();
app.use(routes);

app.listen(3000, () => {
  logger.info('Server listening on port 3000');
});
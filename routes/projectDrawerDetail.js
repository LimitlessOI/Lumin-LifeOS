/**
 * SYNOPSIS: HTTP route module — Project Drawer Detail.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// GET /api/v1/project/drawer
router.get('/drawer', (req, res) => {
  res.json({ project: {} });
});

export function registerProjectDrawerRoutes(app) {
  app.use('/api/v1/project', router);
}

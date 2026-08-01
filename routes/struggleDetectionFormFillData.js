/**
 * SYNOPSIS: HTTP route module — StruggleDetectionFormFillData.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import express from 'express';
import { executeStruggleFormFill } from '../services/struggleFormFill.js';

const router = express.Router();

export function registerStruggleDetectionFormFillDataRoutes(app, deps = {}) {
  app.use('/api/v1/struggle/form-fill-data', router);

  router.post('/', (req, res) => {
    const { userMetrics, formData } = req.body || {};
    if (!userMetrics || !Array.isArray(formData)) {
      return res.status(400).json({ ok: false, error: 'userMetrics and formData are required' });
    }
    const result = executeStruggleFormFill(userMetrics, formData);
    return res.json({ ok: true, result });
  });
}

/**
 * SYNOPSIS: HTTP route module — BuilderOS Token Receipt.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import express from 'express';
import { generateTokenReceipt } from '../services/builderOSTokenReceipt.js';

const router = express.Router();

export function registerBuilderOSTokenReceiptRoutes(app, deps) {
  app.use('/api/v1/builderOS/token-receipt', deps.requireKey, router);

  router.post('/', async (req, res, next) => {
    try {
      const result = await generateTokenReceipt(deps, req.body);
      res.json({ ok: true, receipt: result });
    } catch (error) {
      deps.logger.error({ error }, 'Error in builderOS token receipt route');
      next(error);
    }
  });
}

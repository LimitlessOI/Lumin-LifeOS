/**
 * SYNOPSIS: Registers SalesPageRoutes routes/handlers (routes/salesPageRoute.js).
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function getSalesPage(req, res) {
  res.send('Sales Page for All Offers');
}

export function registerSalesPageRoutes(app) {
  router.get('/sales', getSalesPage);
  app.use(router);
}

export { getSalesPage };
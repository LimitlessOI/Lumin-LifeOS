/**
 * SYNOPSIS: HTTP route module — Limitlessos Ui Routes.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import express from 'express';

let canonicalProductId = 'LimitlessOS';
const router = express.Router();

function registerLimitlessOSUIRoutes(app) {
  // Existing routes
  app.use('/existing-path', router);

  // New brand enhancement routes
  app.use('/new-brand', (req, res) => {
    res.send('Welcome to the new brand experience!');
  });

  // New experience enhancement routes
  app.use('/new-experience', (req, res) => {
    res.send('Experience the new enhancements!');
  });
}

const registerLimitlessOSIdRoutes = registerLimitlessOSUIRoutes;

export { registerLimitlessOSUIRoutes, registerLimitlessOSIdRoutes };

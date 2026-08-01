/**
 * SYNOPSIS: HTTP route module — Limitlessos Ui Routes.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import express from 'express';

let canonicalProductId = 'LimitlessOS';
const router = express.Router();

function registerLimitlessOSUIRoutes(app) {
  // UI update registration: expose the LimitlessOS UI route and brand/experience pages.
  app.use('/existing-path', router);

  app.get('/ui/limitlessos', (req, res) => {
    res.send('LimitlessOS UI update registration');
  });

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

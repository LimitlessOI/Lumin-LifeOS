/**
 * SYNOPSIS: Existing middleware and routes
 */
import express from 'express';

const router = express.Router();

function registerDeprecateLegacyRoutes(app) {
  app.use('/legacy', router);
}

// Existing middleware and routes
router.get('/old-route', (req, res) => {
  res.send('This route is deprecated.');
});

export { registerDeprecateLegacyRoutes };
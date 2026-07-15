/**
 * SYNOPSIS: HTTP route module — LifeosRoutes.
 */
import express from 'express';

const router = express.Router();

function registerLifeosRoutes(app) {
  router.get('/status', (req, res) => {
    res.send({ status: 'LifeOS is running' });
  });

  // Middleware to check directed mode
  router.use((req, res, next) => {
    if (process.env.LIFEOS_DIRECTED_MODE === 'true') {
      // Disable autonomous scheduler
      req.autonomousSchedulerEnabled = false;
    }
    next();
  });

  app.use('/api/lifeos', router);
}

export { registerLifeosRoutes };

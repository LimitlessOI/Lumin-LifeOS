/**
 * SYNOPSIS: HTTP route module — Boldtrail Routes.
 */
import express from 'express';

function registerBoldTrailRoutes(app) {
  const router = express.Router();

  // Example route handling based on the specified lines in server.js
  router.get('/boldtrail/start', (req, res) => {
    res.send('BoldTrail start point');
  });

  router.post('/boldtrail/submit', (req, res) => {
    res.send('BoldTrail submission received');
  });

  router.get('/boldtrail/status', (req, res) => {
    res.send('BoldTrail status check');
  });

  app.use('/api', router);
}

export { registerBoldTrailRoutes };

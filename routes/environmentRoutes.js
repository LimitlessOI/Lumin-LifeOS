/**
 * SYNOPSIS: HTTP route module — EnvironmentRoutes.
 */
import express from 'express';

const router = express.Router();

function registerEnvironmentRoutes(app) {
  router.post('/set-environment', (req, res) => {
    const { VAPI_API_KEY } = req.body;
    
    if (VAPI_API_KEY) {
      process.env.VAPI_API_KEY = VAPI_API_KEY;
      res.status(200).send('Environment variable set successfully');
    } else {
      res.status(400).send('VAPI_API_KEY is required');
    }
  });

  app.use('/api', router);
}

export { registerEnvironmentRoutes };
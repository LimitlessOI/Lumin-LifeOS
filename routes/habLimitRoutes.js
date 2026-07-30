/**
 * SYNOPSIS: HTTP route module — HabLimitRoutes.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';

const habLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many HAB requests from this IP, please try again after 24 hours',
  keyGenerator: (req) => {
    // Assuming the API key is passed in a header named 'x-api-key'
    // or as a query parameter 'apiKey'
    return req.headers['x-api-key'] || req.query.apiKey || req.ip;
  }
});

export const registerHABLimitRoutes = (app) => {
  const router = express.Router();

  // Apply the HAB limiter to all routes within this router
  router.use(habLimiter);

  // Example route that would be protected by the HAB limit
  // You would add your actual HAB-related routes here
  router.get('/hab-data', (req, res) => {
    res.status(200).send('HAB data accessed successfully within limit.');
  });

  // Mount the router to a base path, e.g., '/api/hab'
  app.use('/api/hab', router);
};
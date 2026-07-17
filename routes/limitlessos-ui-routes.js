/**
 * SYNOPSIS: HTTP route module — Limitlessos Ui Routes.
 */
import express from 'express';

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

export { registerLimitlessOSUIRoutes };

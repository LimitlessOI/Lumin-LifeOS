/**
 * SYNOPSIS: HTTP route module — IntakeFormRoute.
 */
import express from 'express';

export const registerIntakeFormRoutes = (app) => {
  const router = express.Router();

  router.get('/intake', (req, res) => {
    // This would typically render an EJS or other template file
    res.send('<h1>Intake Form Page</h1><p>This is where the intake form will be displayed.</p>');
  });

  app.use('/', router);
};
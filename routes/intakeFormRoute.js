/**
 * SYNOPSIS: HTTP route module — IntakeFormRoute.
 */
import express from 'express';

const router = express.Router();

function renderIntakeFormPage(req, res) {
  res.send('<h1>Intake Form Page</h1>');
}

function registerIntakeFormRoutes(app) {
  router.get('/intake-form', renderIntakeFormPage);
  app.use(router);
}

export { registerIntakeFormRoutes };

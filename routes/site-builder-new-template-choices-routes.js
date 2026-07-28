/**
 * SYNOPSIS: HTTP route module — Site Builder New Template Choices Routes.
 */
import express from 'express';

const router = express.Router();

function handleNewTemplateChoices(req, res) {
  // Logic to handle new template choices request
  res.send('Handle new template choices');
}

function registerNewTemplateChoicesRoutes(app) {
  app.use('/api/new-template-choices', router);
}

router.get('/', handleNewTemplateChoices);

export { registerNewTemplateChoicesRoutes };

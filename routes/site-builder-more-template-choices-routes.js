/**
 * SYNOPSIS: Handler to get template choices
 */
import express from 'express';

const router = express.Router();

let templateChoices = [];

// Handler to get template choices
function getTemplateChoices(req, res) {
  res.json(templateChoices);
}

// Handler to set template choices
function setTemplateChoices(req, res) {
  const { choices } = req.body;
  if (!Array.isArray(choices)) {
    return res.status(400).json({ error: 'Choices must be an array' });
  }
  templateChoices = choices;
  res.status(200).json({ success: true });
}

function registerMoreTemplateChoicesRoutes(app) {
  router.get('/template-choices', getTemplateChoices);
  router.post('/template-choices', setTemplateChoices);

  app.use('/api', router);
}

export { registerMoreTemplateChoicesRoutes };

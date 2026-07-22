/**
 * SYNOPSIS: Mock database
 */
import express from 'express';

const router = express.Router();

// Mock database
const templates = [];

// Handler to get all templates
function getTemplates(req, res) {
  res.json(templates);
}

// Handler to add a new template
function addTemplate(req, res) {
  const { name, description, content } = req.body;
  if (!name || !description || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const newTemplate = { id: templates.length + 1, name, description, content };
  templates.push(newTemplate);
  res.status(201).json(newTemplate);
}

// Handler to get a template by ID
function getTemplateById(req, res) {
  const { id } = req.params;
  const template = templates.find((t) => t.id === parseInt(id, 10));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
}

// Handler to update a template by ID
function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, description, content } = req.body;
  const template = templates.find((t) => t.id === parseInt(id, 10));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  template.name = name || template.name;
  template.description = description || template.description;
  template.content = content || template.content;
  res.json(template);
}

// Handler to delete a template by ID
function deleteTemplate(req, res) {
  const { id } = req.params;
  const templateIndex = templates.findIndex((t) => t.id === parseInt(id, 10));
  if (templateIndex === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }
  templates.splice(templateIndex, 1);
  res.status(204).send();
}

// Register routes
function registerNewTemplateRoutes(app) {
  router.get('/templates', getTemplates);
  router.post('/templates', addTemplate);
  router.get('/templates/:id', getTemplateById);
  router.put('/templates/:id', updateTemplate);
  router.delete('/templates/:id', deleteTemplate);

  app.use('/api', router);
}

export { registerNewTemplateRoutes };

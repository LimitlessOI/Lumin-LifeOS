const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Endpoint to get environment template
router.get('/api/v1/config/template', (req, res) => {
  const templatePath = path.resolve(__dirname, '../../env.template');
  if (fs.existsSync(templatePath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    res.type('text/plain').send(template);
  } else {
    res.status(404).send('Template not found');
  }
});

// Endpoint to validate environment
router.post('/api/v1/config/validate', (req, res) => {
  try {
    require('../../scripts/env-validate');
    res.status(200).send('Environment validation passed.');
  } catch (error) {
    res.status(400).send('Environment validation failed.');
  }
});

// Endpoint for specific environment configuration
router.get('/api/v1/config/environment/:env', (req, res) => {
  const env = req.params.env;
  const configPath = path.resolve(__dirname, `../../config/environments/${env}.js`);
  if (fs.existsSync(configPath)) {
    const config = require(configPath);
    res.json(config);
  } else {
    res.status(404).send('Environment configuration not found');
  }
});

module.exports = router;
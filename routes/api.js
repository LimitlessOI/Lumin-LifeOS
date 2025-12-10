const express = require('express');
const ConfigService = require('../services/ConfigService');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

router.get('/config', (req, res) => {
  try {
    const configKeys = ['NODE_ENV', 'PORT', 'DB_HOST', 'DB_NAME'];
    const config = configKeys.reduce((acc, key) => {
      acc[key] = ConfigService.get(key);
      return acc;
    }, {});
    res.json(config);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
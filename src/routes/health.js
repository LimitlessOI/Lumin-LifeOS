const express = require('express');
const router = express.Router();
const config = require('../config');

router.get('/health', (req, res) => {
  res.json({ status: 'OK', environment: config.get('env') });
});

router.get('/config', (req, res) => {
  res.json({ config: config.getProperties() });
});

module.exports = router;
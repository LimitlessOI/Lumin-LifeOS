const express = require('express');
const router = express.Router();
const config = require('../config');
const dotenv = require('dotenv');

router.post('/config/reload', (req, res) => {
  dotenv.config();
  config.loadFile('.env');
  config.validate({ allowed: 'strict' });
  res.json({ status: 'Config reloaded' });
});

module.exports = router;
// server.js
const express = require('express');
const whiteLabelRoutes = require('./routes/white-label-routes');

const app = express();

app.use('/api/white-label', whiteLabelRoutes);

module.exports = app;

// routes/white-label-routes.js
const express = require('express');
const router = express.Router();

router.get('/settings', (req, res) => {
  // implementation of /config/white-label/settings
});

router.get('/other-endpoint', (req, res) => {
  // implementation of /config/white-label/other-endpoint
});

module.exports = router;
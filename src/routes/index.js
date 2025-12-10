```javascript
const express = require('express');
const { funnelController } = require('../controllers/funnelController');

function setupRoutes(app) {
  const router = express.Router();

  router.get('/funnel', funnelController.getFunnelData);
  // Add more routes as needed

  app.use('/api', router);
}

module.exports = { setupRoutes };
```
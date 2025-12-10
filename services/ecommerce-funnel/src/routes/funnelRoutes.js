```javascript
const express = require('express');
const funnelController = require('../controllers/funnelController');

const router = express.Router();

router.post('/funnels', funnelController.createFunnel);
router.get('/funnels', funnelController.getFunnels);

// Add additional routes as necessary

module.exports = router;
```
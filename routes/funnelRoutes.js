```javascript
const express = require('express');
const FunnelController = require('../controllers/funnel-controller');

const router = express.Router();
const funnelController = new FunnelController();

router.post('/analyze', (req, res) => funnelController.analyzeFunnel(req, res));

module.exports = router;
```
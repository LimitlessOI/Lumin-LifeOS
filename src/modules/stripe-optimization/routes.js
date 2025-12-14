```javascript
const express = require('express');
const clientController = require('./controllers/clientController');
const analysisController = require('./controllers/analysisController');
const authMiddleware = require('./middleware/auth');

const router = express.Router();

router.post('/clients', authMiddleware, clientController.registerClient);
router.get('/clients/:clientId/payments', authMiddleware, clientController.getPayments);
router.post('/clients/:clientId/analyze', authMiddleware, analysisController.triggerAnalysis);
router.get('/clients/:clientId/insights', authMiddleware, analysisController.getInsights);

module.exports = router;
```
```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

router.get('/system-status', adminAuth, adminController.getSystemStatus);
router.get('/user-analytics', adminAuth, adminController.getUserAnalytics);
router.post('/chatbot-configs', adminAuth, adminController.manageChatbotConfigs);
router.post('/rbac', adminAuth, adminController.manageRBAC);

module.exports = router;
```
```javascript
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// CRUD operations
router.post('/interactions', dashboardController.createInteraction);
router.get('/interactions/:id', dashboardController.getInteraction);
router.put('/interactions/:id', dashboardController.updateInteraction);
router.delete('/interactions/:id', dashboardController.deleteInteraction);

router.post('/support-tickets', dashboardController.createSupportTicket);
router.get('/support-tickets/:id', dashboardController.getSupportTicket);
router.put('/support-tickets/:id', dashboardController.updateSupportTicket);
router.delete('/support-tickets/:id', dashboardController.deleteSupportTicket);

module.exports = router;
```
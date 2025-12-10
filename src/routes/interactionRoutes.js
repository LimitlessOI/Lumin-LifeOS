```javascript
const express = require('express');
const interactionController = require('../controllers/interactionController');

const router = express.Router();

router.post('/interactions', interactionController.recordInteraction);
router.get('/interactions', interactionController.getInteractions);

module.exports = router;
```
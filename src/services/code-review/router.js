```javascript
const express = require('express');
const { check } = require('express-validator');
const controller = require('./controller');
const authMiddleware = require('./middleware/auth');
const { validateSubmission } = require('./validators/submission');

const router = express.Router();

router.use(authMiddleware);

router.post('/submit', validateSubmission, controller.submitProject);
router.get('/analytics/:projectId', controller.getProjectAnalytics);

module.exports = router;
```
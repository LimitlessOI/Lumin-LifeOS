```javascript
const express = require('express');
const codeReviewController = require('../controllers/codeReviewController');
const { authenticate } = require('../middleware/authentication');

const router = express.Router();

router.post('/submit', authenticate, codeReviewController.submitCode);
router.get('/submissions', authenticate, codeReviewController.listSubmissions);
router.get('/submission/:id', authenticate, codeReviewController.getSubmission);

module.exports = router;
```
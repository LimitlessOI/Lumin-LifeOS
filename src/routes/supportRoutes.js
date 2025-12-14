```javascript
const express = require('express');
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);
router.use(rateLimiter);

router.post('/conversations', supportController.createConversation);
router.get('/conversations/:id', supportController.getConversation);
router.post('/messages', supportController.postMessage);
router.get('/messages/:conversationId', supportController.getMessages);

module.exports = router;
```
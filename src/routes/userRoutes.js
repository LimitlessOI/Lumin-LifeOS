```javascript
const express = require('express');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');
const subscriptionMiddleware = require('../middleware/subscription');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.put('/subscription', authMiddleware, subscriptionMiddleware, UserController.updateSubscription);

module.exports = router;
```
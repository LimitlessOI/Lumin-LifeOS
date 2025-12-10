```javascript
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

router.post('/register',
    body('username').isString().notEmpty(),
    body('password').isString().isLength({ min: 6 }),
    validate,
    authController.register
);

router.post('/login',
    body('username').isString().notEmpty(),
    body('password').isString().notEmpty(),
    validate,
    authController.login
);

module.exports = router;
```
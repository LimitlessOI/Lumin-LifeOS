```javascript
const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators/authValidators');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);

module.exports = router;
```
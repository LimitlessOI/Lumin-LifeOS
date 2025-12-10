```javascript
const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const userValidation = require('../middleware/userValidation');

router.post('/register', userValidation.validateRegister, async (req, res, next) => {
    try {
        const user = await UserService.registerUser(req.body.username, req.body.email, req.body.password);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

router.post('/login', userValidation.validateLogin, async (req, res, next) => {
    try {
        const result = await UserService.authenticateUser(req.body.email, req.body.password);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
```
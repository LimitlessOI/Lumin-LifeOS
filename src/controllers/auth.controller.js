```javascript
const authService = require('../services/auth.service');
const logger = require('../utils/logger');

async function register(req, res) {
    try {
        const token = await authService.register(req.body.username, req.body.password);
        res.status(201).json({ token });
    } catch (error) {
        logger.error(error.message);
        res.status(400).json({ message: error.message });
    }
}

async function login(req, res) {
    try {
        const token = await authService.login(req.body.username, req.body.password);
        res.status(200).json({ token });
    } catch (error) {
        logger.error(error.message);
        res.status(401).json({ message: error.message });
    }
}

module.exports = {
    register,
    login
};
```
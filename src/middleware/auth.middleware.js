```javascript
const { verifyToken } = require('../utils/jwt.utils');
const logger = require('../utils/logger');

function authenticateJWT(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) {
        logger.error('No token provided');
        return res.status(401).json({ message: 'Access denied' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Invalid token');
        res.status(403).json({ message: 'Invalid token' });
    }
}

module.exports = authenticateJWT;
```
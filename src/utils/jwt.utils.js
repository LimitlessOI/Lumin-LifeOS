```javascript
const jwt = require('jsonwebtoken');
const { jwtSecret, tokenExpiry } = require('../config/auth.config');

function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: tokenExpiry });
}

function verifyToken(token) {
    return jwt.verify(token, jwtSecret);
}

module.exports = {
    generateToken,
    verifyToken
};
```
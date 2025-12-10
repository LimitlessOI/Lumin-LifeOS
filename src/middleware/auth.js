```javascript
const { verifyToken } = require('../utils/security/jwt');

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization').split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ message: 'Invalid token' });
  }

  req.user = payload;
  next();
};

module.exports = { authenticateJWT };
```
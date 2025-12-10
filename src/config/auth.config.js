```javascript
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  jwtExpiration: '1h',
  jwtRefreshExpiration: '7d',
};
```
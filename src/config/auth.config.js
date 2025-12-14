```javascript
require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
    tokenExpiry: '1h' // Token expiry time
};
```
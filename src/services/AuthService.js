```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserService = require('./UserService');

class AuthService {
  static async register(email, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    return await UserService.createUser(email, passwordHash);
  }

  static async login(email, password) {
    const user = await UserService.getUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return token;
    }
    throw new Error('Invalid credentials');
  }
}

module.exports = AuthService;
```
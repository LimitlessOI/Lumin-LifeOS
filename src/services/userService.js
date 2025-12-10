```javascript
const UserRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class UserService {
    async registerUser(username, email, password) {
        const passwordHash = await bcrypt.hash(password, 10);
        return UserRepository.createUser(username, email, passwordHash);
    }

    async authenticateUser(email, password) {
        const user = await UserRepository.getUserByEmail(email);
        if (user && await bcrypt.compare(password, user.password_hash)) {
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return { user, token };
        }
        throw new Error('Authentication failed');
    }
}

module.exports = new UserService();
```
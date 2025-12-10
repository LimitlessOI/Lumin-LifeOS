```javascript
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt.utils');
const userRepository = require('../repositories/user.repository');

async function register(username, password) {
    const existingUser = await userRepository.findUserByUsername(username);
    if (existingUser) {
        throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.createUser(username, passwordHash);
    return generateToken(user);
}

async function login(username, password) {
    const user = await userRepository.findUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new Error('Invalid username or password');
    }

    return generateToken(user);
}

module.exports = {
    register,
    login
};
```
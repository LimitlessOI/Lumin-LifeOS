const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('./user-service');

const SECRET_KEY = process.env.JWT_SECRET;

const register = async (email, password) => {
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
        throw new Error('User already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    return userService.createUser(email, passwordHash);
};

const login = async (email, password) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new Error('User not found');
    }
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new Error('Invalid password');
    }
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
    return { token, user };
};

const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};

module.exports = {
    register,
    login,
    verifyToken
};
//
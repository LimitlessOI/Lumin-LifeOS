```javascript
const { validationResult } = require('express-validator');
const { hashPassword, verifyPassword } = require('../utils/security/password');
const { generateToken } = require('../utils/security/jwt');
const { createUser, findUserByUsername } = require('../models/User');
const { createSession, deleteSession } = require('../models/Session');

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  const passwordHash = await hashPassword(password);
  const user = await createUser(username, email, passwordHash);

  res.status(201).json({ user });
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const user = await findUserByUsername(username);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken({ userId: user.id });
  await createSession(user.id, token, new Date(Date.now() + 3600000)); // 1 hour session

  res.json({ token });
};

const logout = async (req, res) => {
  const { token } = req.body;
  await deleteSession(token);
  res.status(204).send();
};

module.exports = { register, login, logout };
```
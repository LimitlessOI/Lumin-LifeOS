```javascript
const AuthService = require('../services/AuthService');

module.exports = {
  async register(req, res) {
    try {
      const { email, password } = req.body;
      const user = await AuthService.register(email, password);
      res.status(201).send(user);
    } catch (error) {
      res.status(500).send({ error: 'Error registering user' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const token = await AuthService.login(email, password);
      res.status(200).send({ token });
    } catch (error) {
      res.status(401).send({ error: 'Invalid credentials' });
    }
  }
};
```
```javascript
const UserService = require('../services/UserService');

module.exports = {
  async updateSubscription(req, res) {
    try {
      const { userId, status } = req.body;
      await UserService.updateUserSubscription(userId, status);
      res.status(200).send({ message: 'Subscription updated' });
    } catch (error) {
      res.status(500).send({ error: 'Error updating subscription' });
    }
  }
};
```
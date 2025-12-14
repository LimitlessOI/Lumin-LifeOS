```javascript
const UserService = require('../services/UserService');

module.exports = async (req, res, next) => {
  try {
    const user = await UserService.getUserByEmail(req.userId);
    if (user.subscription_status !== 'active') {
      return res.status(403).send({ error: 'Access denied. Subscription required.' });
    }
    next();
  } catch (error) {
    res.status(500).send({ error: 'Failed to verify subscription status' });
  }
};
```
```javascript
const { OptimizationClient } = require('../models/OptimizationClient');

const authMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    const client = await OptimizationClient.findOne({ where: { apiKey } });
    if (!client) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    req.client = client;
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = authMiddleware;
```
```javascript
const { OptimizationClient } = require('../models/OptimizationClient');
const { retrieveCustomerPayments } = require('../services/stripeService');

const registerClient = async (req, res) => {
  try {
    const { apiKey } = req.body;
    const client = await OptimizationClient.create({ apiKey });
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { customerId } = req.query;
    const payments = await retrieveCustomerPayments(clientId, customerId);
    res.json(payments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerClient,
  getPayments
};
```
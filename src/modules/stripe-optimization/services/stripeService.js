```javascript
const Stripe = require('stripe');
const { OptimizationClient } = require('../models/OptimizationClient');

const getStripeClient = async (clientId) => {
  const client = await OptimizationClient.findByPk(clientId);
  if (!client) {
    throw new Error('Client not found');
  }
  return new Stripe(client.apiKey);
};

const retrieveCustomerPayments = async (clientId, customerId) => {
  const stripe = await getStripeClient(clientId);
  return stripe.paymentIntents.list({ customer: customerId });
};

module.exports = {
  getStripeClient,
  retrieveCustomerPayments
};
```
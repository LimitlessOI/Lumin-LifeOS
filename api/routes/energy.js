```javascript
const express = require('express');
const router = express.Router();
const { processPayment } = require('../services/payment-service/stripe-integration');

router.post('/trade', async (req, res) => {
  // handle trade logic
});

router.post('/payment', async (req, res) => {
  try {
    const { amount, currency, source, description } = req.body;
    const paymentIntent = await processPayment(amount, currency, source, description);
    res.status(200).json(paymentIntent);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
```
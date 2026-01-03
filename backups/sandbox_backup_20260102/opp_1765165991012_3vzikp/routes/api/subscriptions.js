const express = require('express');
const router = new express.Router();

router.post('/', async (req, res) => {
  // Create a subscription and link it to the userId in Users table
  const response = await SubscriptionService.createSubscription(req);
  return res.json(response);
});

router.get('/:userId/subscriptions', async (req, res) => {
  // List all active subscriptions tied back to the userId in Users table for a particular user
  const response = await SubscriptionService.listSubscriptionsForUser(req.params.userId);
  return res.json(response);
});

module.exports = router;
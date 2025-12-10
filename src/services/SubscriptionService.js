```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const UserService = require('./UserService');

class SubscriptionService {
  static async createSubscription(userId, stripeToken) {
    const user = await UserService.getUserByEmail(userId);
    const customer = await stripe.customers.create({
      email: user.email,
      source: stripeToken,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: process.env.STRIPE_PLAN_ID }],
    });

    await UserService.updateUserSubscription(userId, 'active');
    return subscription;
  }
}

module.exports = SubscriptionService;
```
/**
 * SYNOPSIS: Configuration — StripeConfig.
 */
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
```
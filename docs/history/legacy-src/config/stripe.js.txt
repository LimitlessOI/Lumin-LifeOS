/**
 * SYNOPSIS: js — src/config/stripe.js.
 */
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
```
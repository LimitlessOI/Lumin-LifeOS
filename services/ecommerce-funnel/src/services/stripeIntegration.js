```javascript
const stripe = require('stripe')(process.env.STRIPE_KEY);

exports.getRevenue = async () => {
  try {
    const charges = await stripe.charges.list({ limit: 100 });
    return charges.data.reduce((acc, charge) => acc + charge.amount, 0);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    throw error;
  }
};
```
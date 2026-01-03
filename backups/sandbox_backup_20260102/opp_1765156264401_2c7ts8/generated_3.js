const stripe = require('@stripe/stripe-js')(process.env.STRIPE_SECRET); // Make sure to replace this with your actual secret key or use environment variables safely! 

// ... other necessary imports and functions...

module.exports = function setupStripeConfig() {
    return stripe;
};
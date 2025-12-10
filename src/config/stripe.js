const stripe = require('stripe');
const config = require('./index');

const stripeClient = stripe(config.get('stripe.apiKey'));

module.exports = stripeClient;
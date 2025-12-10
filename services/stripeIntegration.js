const stripe = require('stripe')('your-stripe-secret-key');

async function createConservationCharge(amount, currency, description) {
    try {
        const charge = await stripe.charges.create({
            amount,
            currency,
            description,
            source: 'tok_visa' // Example token, replace with actual token from client
        });
        console.log('Charge created:', charge);
        return charge;
    } catch (error) {
        console.error('Error creating charge:', error);
    }
}

module.exports = { createConservationCharge };
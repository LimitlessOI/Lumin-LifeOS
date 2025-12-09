```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createSubscription(userId, tier) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: userId,
            items: [{ plan: tier }]
        });
        console.log('Subscription created:', subscription.id);
        return subscription;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

async function monitorInfrastructure() {
    console.log('Monitoring critical infrastructure...');
    // Add logic to monitor infrastructure
}

module.exports = {
    createSubscription,
    monitorInfrastructure
};
```
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../utils/database');

const createSubscriptionPlan = async (name, price, features) => {
    const result = await db.query(
        'INSERT INTO subscription_plans (name, price, features) VALUES ($1, $2, $3) RETURNING *',
        [name, price, features]
    );
    return result.rows[0];
};

const subscribeUserToPlan = async (userId, planId) => {
    const result = await db.query(
        'INSERT INTO user_subscriptions (user_id, plan_id, status) VALUES ($1, $2, $3) RETURNING *',
        [userId, planId, 'active']
    );
    return result.rows[0];
};

const cancelSubscription = async (subscriptionId) => {
    const result = await db.query(
        'UPDATE user_subscriptions SET status = $1 WHERE id = $2 RETURNING *',
        ['cancelled', subscriptionId]
    );
    return result.rows[0];
};

module.exports = {
    createSubscriptionPlan,
    subscribeUserToPlan,
    cancelSubscription
};
//
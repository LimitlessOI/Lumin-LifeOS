const express = require('express');
const router = new express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Ensure to set the environment variable beforehand

router.get('/api/v1/users', (req, res) => {
    const users = /* query User model from Neon database */;
    res.json(users);
});

router.post('/api/v1/tasks', async (req, res) => {
    try {
        // Extract task details from request body and save in the tasks table associated with a user ID
        const createdTask = /* logic to create or update task */;
        
        if (!createdTask.error && !stripe.card.createToken(req.body.paymentInfo, stripe).then(() => {
            // Handle payment setup (optional) and redirect for Stripe checkout flow here
        }).catch((err) => createdTask.error = err);
        
        res.json(createdTask);
    } catch (err) {
        res.status(400).send({ error: 'Invalid input' });
    a}
});

router.get('/api/v1/tasks/:userId', async (req, res) => {
    try {
        const tasks = /* query Tasks related to req.params.userId from Neon database */;
        res.json(tasks);
    } catch (err) {
        res.status(400).send({ error: 'Invalid input' });
    }}
);

router.delete('/api/v1/tasks/:taskId', async (req, res) => {
    try {
        // Delete task associated with req.params.userId from the tasks table in Neon database 
        res.status(204).send();
    } catch (err) {
        res.status(400).send({ error: 'Invalid input' });
    }}
);
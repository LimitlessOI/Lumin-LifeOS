const express = require('express');
const router = new express.Router();

// POST order creation endpoint
router.post('/orders', async (req, res) => {
    const userId = req.body.userId; // Assuming the body contains necessary details
    try {
        await db.beginTransaction();
        const result = await db.query('INSERT INTO orders(user_id, product_details, quantity, price) VALUES($1, $2, $3, $4) RETURNING *', [userId, req.body.productDetails, parseInt(req.body.quantity), parseFloat(req.body.price)]);
        await db.commit();
        res.status(201).json(result[0]);
    } catch (err) {
        console.error(err);
        await db.rollback();
        res.status(400).send('Bad Request');
    }
});

// GET orders endpoint, fetching all completed and pending ones
router.get('/orders', async (req, res) => {
    try {
        const statuses = req.query.status ? [req.query.status] : ['pending', 'completed']; // Get based on provided or default values
        const ordersQuery = await db.query('SELECT * FROM orders WHERE status IN ($1) AND completed_at IS NULL OR completed_at IS NOT NULL ORDER BY created_at DESC';, [...new Set(statuses)]);
        
        res.json(ordersQuery);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// POST tasks_log creation endpoint for light tasks AI performed, with timestamp as part of log entry itself to avoid redundant logging when the same task is logged multiple times within short time frame (to be implemented in a similar fashion)
router.post('/tasks_log', async (req, res) => {
    try {
        await db.beginTransaction();
        
        const result = await db.query('INSERT INTO tasks_log(description) VALUES($1) RETURNING *', [req.body.taskDescription]); // Assuming task description is unique for now; this can be expanded to include other details if necessary
        await db.commit();
        res.status(201).json(result[0]);
    } catch (err) {
        console.error(err);
        await db.rollback();
        res.status(400).send('Bad Request');
    }
});
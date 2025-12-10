```js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all workflows
router.get('/', async (req, res) => {
    try {
        const workflows = await db.query('SELECT * FROM automation_workflows');
        res.json(workflows.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Add a new workflow
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    try {
        const newWorkflow = await db.query(
            'INSERT INTO automation_workflows (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.json(newWorkflow.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
```
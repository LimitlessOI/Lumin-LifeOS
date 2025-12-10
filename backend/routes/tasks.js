```js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get tasks for a workflow
router.get('/:workflowId/tasks', async (req, res) => {
    try {
        const tasks = await db.query('SELECT * FROM automation_tasks WHERE workflow_id = $1', [req.params.workflowId]);
        res.json(tasks.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Add a new task to a workflow
router.post('/:workflowId/tasks', async (req, res) => {
    const { name, type, config } = req.body;
    try {
        const newTask = await db.query(
            'INSERT INTO automation_tasks (workflow_id, name, type, config) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.workflowId, name, type, config]
        );
        res.json(newTask.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
```
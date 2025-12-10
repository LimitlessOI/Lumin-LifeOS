```javascript
const express = require('express');
const router = express.Router();

// Mock success rate data
const assistants = [
    { id: 1, name: 'Google', success_rate: 0.9 },
    { id: 2, name: 'Alexa', success_rate: 0.85 },
    { id: 3, name: 'OpenAI', success_rate: 0.95 }
];

// Arbitrator function to select the best assistant
function arbitrateTask(task) {
    return assistants.reduce((best, current) => {
        return (current.success_rate > best.success_rate) ? current : best;
    });
}

// API endpoint for task arbitration
router.post('/arbitrate', (req, res) => {
    const task = req.body.task;
    const selectedAssistant = arbitrateTask(task);
    res.json({ selectedAssistant });
});

module.exports = router;
```
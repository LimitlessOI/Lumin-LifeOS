const express = require('express');
const router = express.Router();

// Mock data for the dashboard
const healthData = {
    currentBuilds: ['Pod1', 'Pod2', 'Pod3'],
    queueStatus: 5,
    budgetSpend: 1200,
    recentCompletions: ['PR1 (Merged)', 'PR2 (Merged)', 'PR3 (Merged)', 'PR4 (Merged)', 'PR5 (Merged)', 'PR6 (Merged)', 'PR7 (Merged)', 'PR8 (Merged)', 'PR9 (Merged)', 'PR10 (Merged)'],
    systemHealth: 'green', // options: green, yellow, red
    strategicDecisions: [
        { title: 'Decision 1', link: 'http://example.com/decision1' },
        { title: 'Decision 2', link: 'http://example.com/decision2' }
    ]
};

router.get('/health', (req, res) => {
    res.json(healthData);
});

module.exports = router;
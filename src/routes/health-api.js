const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    // Mock Data - Replace with real data fetching logic
    const data = {
        currentBuilds: ['pod1', 'pod2'],
        queueStatus: { waiting: 5 },
        budgetSpend: 1500.00,
        recentPRs: [
            { pr: 'PR #1', status: 'merged' },
            { pr: 'PR #2', status: 'merged' },
            { pr: 'PR #3', status: 'merged' },
            { pr: 'PR #4', status: 'merged' },
            { pr: 'PR #5', status: 'merged' },
            { pr: 'PR #6', status: 'merged' },
            { pr: 'PR #7', status: 'merged' },
            { pr: 'PR #8', status: 'merged' },
            { pr: 'PR #9', status: 'merged' },
            { pr: 'PR #10', status: 'merged' }
        ],
        systemHealth: { status: 'Healthy', color: 'green' },
        strategicDecisions: [
            { description: 'Decision 1', link: 'http://example.com/decision1' },
            { description: 'Decision 2', link: 'http://example.com/decision2' }
        ]
    };
    res.json(data);
});

module.exports = router;
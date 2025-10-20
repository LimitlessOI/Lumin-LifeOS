const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/api/v1/system/status', async (req, res) => {
    const lastClaimedTask = await db.query('SELECT updated_at FROM orch_tasks WHERE status = ? ORDER BY updated_at DESC LIMIT 1', ['claimed']);
    const claimedCount = await db.query('SELECT COUNT(*) as count FROM orch_tasks WHERE status = ?', ['claimed']);
    const queueDepth = await db.query('SELECT COUNT(*) as count FROM orch_tasks WHERE status = ?', ['queued']);
    const lastDeploymentStatus = await fetch('https://api.railway.app/deployment/status');

    res.json({
        lastTaskClaimed: lastClaimedTask[0].updated_at,
        currentClaimedCount: claimedCount[0].count,
        queueDepth: queueDepth[0].count,
        lastDeploymentStatus: lastDeploymentStatus,
        railwayHealth: 'Check Railway API for details'
    });
});

module.exports = router;
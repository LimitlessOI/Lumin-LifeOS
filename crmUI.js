// crmUI.js
const express = require('express');
const router = express.Router();

router.get('/crm', async (req, res) => {
    const tasks = await getTodayTasks();
    res.render('crm', { tasks });
});

async function getTodayTasks() {
    // Logic to fetch today tasks from Notion
}

module.exports = router;
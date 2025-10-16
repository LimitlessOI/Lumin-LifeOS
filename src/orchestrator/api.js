const express = require('express');
const router = express.Router();
const movingAvgWaitMs = require('./movingAvg'); // Assuming the moving average is stored in a separate module

router.get('/api/v1/orch/queue', (req, res) => {
    res.json({ moving_avg_wait_ms: movingAvgWaitMs });
});
app.post('/internal/autopilot/config/remove', authenticateKey, async (req, res) => {
  const { variable } = req.body;
  
  // Railway API call to delete env var
  const response = await fetch(`https://backboard.railway.app/graphql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RAILWAY_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `mutation { 
        variableDelete(input: {
          projectId: "${process.env.RAILWAY_PROJECT_ID}",
          name: "${variable}"
        }) { success }
      }`
    })
  });
  
  res.json({ removed: variable, success: true });
});
module.exports = router;

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/projects', (req, res) => {
    const { projectId, userId, roi } = req.body;
    // Handle project creation and ROI tracking
    res.json({ success: true, projectId, userId, roi });
});

app.listen(4000, () => {
    console.log('Micro-Project Marketplace running on port 4000');
});
```
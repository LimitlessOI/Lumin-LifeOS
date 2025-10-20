const express = require('express');
const app = express();

const AUTO_MERGE_THRESHOLD = 0.60;

app.use(express.json());

// Endpoint to revert last merge
app.post('/api/v1/emergency/revert-last', (req, res) => {
    // Implementation will be in auto-revert.js
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

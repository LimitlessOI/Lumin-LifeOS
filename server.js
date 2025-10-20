// server.js

const express = require('express');
const app = express();

// Lower AUTO_MERGE_THRESHOLD to 0.75
const AUTO_MERGE_THRESHOLD = 0.75;

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = { AUTO_MERGE_THRESHOLD };
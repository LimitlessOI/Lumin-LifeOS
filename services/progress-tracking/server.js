const express = require('express');
const app = express();
app.use(express.json());

app.listen(3003, () => {
    console.log('Progress Tracking Service running on port 3003');
});
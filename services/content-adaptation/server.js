const express = require('express');
const app = express();
app.use(express.json());

app.listen(3002, () => {
    console.log('Content Adaptation Service running on port 3002');
});
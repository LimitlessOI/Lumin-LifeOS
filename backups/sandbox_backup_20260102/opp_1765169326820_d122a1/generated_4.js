const express = require('express');
const apiRouter = require('./routes/api');

const app = express();
app.use('/api', apiRouter);
// Additional middleware or logic for handling migrations, error handlers can be added here if needed 

module.exports = app;
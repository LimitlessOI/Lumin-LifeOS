const express = require('express');
require('dotenv').config(); // for environment variables like DB credentials
const app = express();
app.use(express.json());
// Load routes and initialize database connection...
module.exports = app;
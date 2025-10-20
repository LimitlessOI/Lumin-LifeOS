// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const outreachRoutes = require('./routes/outreach');
const config = require('./config/config');

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/v1/outreach', outreachRoutes);

// Start the server
const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
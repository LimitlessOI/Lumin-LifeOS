const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Initialize Express app with CORS enabled and middleware for parsing request bodies
const app = express();
app.use(bodyParser.json()); // For parsing application/json
app.use(cors({ origin: '*' })); // Enables Cross-Origin Resource Sharing (CORS), modify as necessary to only allow specific origins
// ... additional middleware and settings...
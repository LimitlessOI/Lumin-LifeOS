const express = require('express');
require('dotenv').config();
const apiRoutes = require('./api/routes');
// ... more required modules...

const app = express();
app.use(express.json()); // for parsing application/json

// Apply environment variables from .env file or similar configuration files here, e.g.,:
require('dotenv').config({ path: './.env' }); 

// ... additional middleware if needed...

apiRoutes(app);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console002_console.info(`Server is running on port ${PORT}`);
});
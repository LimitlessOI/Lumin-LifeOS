// Import necessary modules
const express = require('express');
const chatRoutes = require('./src/routes/chat');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Healthcheck Endpoint
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

// Chat Routes
app.use('/chat', chatRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// server/index.js (main file)
const express = require('express');
const userRoutes = require('./routes/api'); 
const app = new express.Router();
app.use('/api/v1', userRoutes); // Mounting routes for User management at this path in the API namespace within our main server file structure to provide clear separation and organization of functionality under each microservice's scope, following Kubernetes best practices by creating separate deployments or pod templates that are bound together via service abstractions
const port = 3000; // Assuming we want a web interface as well for Make.com scenarios - can be moved to the API route file if necessary (not shown here)
app.listen(port, () => {
    console0.log(`Server is running on http://localhost:${port}`); 
});
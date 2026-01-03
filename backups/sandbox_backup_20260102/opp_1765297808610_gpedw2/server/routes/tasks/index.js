const express = require('express');
// Requires and imports other modules like task controllers here...

module.exports = function(app) {
    const tasksRouter = express.Router();
    
    // CRUD operations for Tasks API, e.g.:
    app.get('/tasks', getTasks); 
    app.post('/tasks', createTask);  
    app.put('/tasks/:id', updateTask);     
    app.delete('/tasks/:id', deleteTask);    
    
    tasksRouter(app);
};
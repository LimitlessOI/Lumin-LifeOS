===FILE:routes/api_v1/workflows.js===
const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();

router.post('/', [check('customer_id').isInt(), 
                   (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid customer ID' });
    }
    
    // Insert code to save workflow request in the Neon PostgreSQL database and start a new service flow instance, 
    // possibly with callbacks for when it fails or succeeds based on your actual implementation.
}]);

router.get('/progress/:workflow_id', (req, res) => {
    const workflowId = req.params.workflow_id;
    
    // Insert code to query the database with a prepared statement for efficient data retrieval and return it in JSON format.
});

// Additional API endpoints...
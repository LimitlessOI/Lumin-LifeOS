/**
 * SYNOPSIS: Existing setup
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import express from 'express';

// Existing setup
const router = express.Router();

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).send('Access denied.');
    }
}

// Function to handle session replay
function handleSessionReplay(req, res) {
    // Placeholder: Implement logic to retrieve and send session data
    res.send('Session replay data for admin.');
}

// Register the routes
function registerSessionReplayRoutes(app) {
    // Existing routes here...

    // New route for admin session replay
    router.get('/admin/session-replay', isAdmin, handleSessionReplay);
    app.use('/api', router);
}

export { registerSessionReplayRoutes };

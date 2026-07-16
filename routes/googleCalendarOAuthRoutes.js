/**
 * SYNOPSIS: Route to handle Google Calendar OAuth callback
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// Route to handle Google Calendar OAuth callback
router.get('/auth/google/callback', (req, res) => {
  // Handle OAuth callback logic here
  // For example, exchange authorization code for tokens, store tokens, etc.
  res.send('Google Calendar OAuth callback handled.');
});

// Function to register routes
function registerGoogleCalendarOAuthRoutes(app) {
  app.use('/api', router);
}

// Export the function as an ES module
export { registerGoogleCalendarOAuthRoutes };

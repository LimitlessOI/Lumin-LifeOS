/**
 * SYNOPSIS: Mock function to simulate fetching user data
 */
import express from 'express';

const router = express.Router();

// Mock function to simulate fetching user data
function getUserData(userId) {
  // Replace with actual data retrieval logic
  return {
    name: 'John Doe',
    email: 'john.doe@example.com',
    address: '123 Main St',
  };
}

// Route handler for form filling
function accountFormFillHandler(req, res) {
  const userId = req.user.id; // Assuming authentication middleware attaches user object to request
  const userData = getUserData(userId);
  res.json(userData);
}

// Register routes
function registerAccountFormFillRoutes(app) {
  router.get('/account/form-fill', accountFormFillHandler);
  app.use('/api', router);
}

export { registerAccountFormFillRoutes };
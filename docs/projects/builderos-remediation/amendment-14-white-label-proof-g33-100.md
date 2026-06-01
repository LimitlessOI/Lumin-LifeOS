// src/builder-config/default-white-label.js
const defaultWhiteLabelConfig = {
  appName: "BuilderOS Default",
  logoUrl: "https://cdn.builderos.com/default-logo.svg",
  primaryColor: "#007bff",
  secondaryColor: "#6c757d",
  fontFamily: "Arial, sans-serif",
  // Additional default properties can be added here as the white-label schema evolves
};

export default defaultWhiteLabelConfig;

// src/builder-api/controllers/white-label-controller.js
import defaultWhiteLabelConfig from '../builder-config/default-white-label.js';

export const getDefaultWhiteLabelConfig = (req, res) => {
  try {
    // Serve the static default white-label configuration
    res.status(200).json(defaultWhiteLabelConfig);
  } catch (error) {
    console.error('Error serving default white-label config:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// src/builder-api/routes/white-label.js
import { Router } from 'express';
import { getDefaultWhiteLabelConfig } from '../controllers/white-label-controller.js';

const router = Router();

// Define the GET route for retrieving the default white-label configuration
router.get('/default', getDefaultWhiteLabelConfig);

// Handle unsupported methods for this specific endpoint to return 405 Method Not Allowed
router.all('/default', (req, res) => {
  res.status(405).json({ message: 'Method Not Allowed' });
});

export default router;

// src/builder-api/index.js
import express from 'express';
import whiteLabelRoutes from './routes/white-label.js';
// Assume other existing imports for routes and middleware here

const app = express();
const PORT = process.env.BUILDER_API_PORT || 3001; // Example default port for BuilderOS API

// Standard middleware setup
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Register existing BuilderOS API routes here
// Example: app.use('/builder/users', userRoutes);

// Register the new white-label configuration routes
// The blueprint specifies the full path as /builder/config/white-label/default
// So the base path for the whiteLabelRoutes router should be /builder/config/white-label
app.use('/builder/config/white-label', whiteLabelRoutes);

// Basic health check endpoint for BuilderOS API
app.get('/builder/health', (req, res) => {
  res.status(200).json({ status: 'BuilderOS API is running', uptime: process.uptime() });
});

// Global error handling middleware (example)
app.use((err, req, res, next) => {
  console.error('Global API Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`BuilderOS API listening on port ${PORT}`);
});

export default app; // Export the app for testing or modular use
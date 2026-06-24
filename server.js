/**
 * SYNOPSIS: Load environment variables from .env file
 */
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Determine __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration object
// Centralized place for application settings, making them easily accessible and modifiable.
const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  // Add other configuration parameters here as needed, e.g., database connection strings, API keys
  // db: {
  //   host: process.env.DB_HOST,
  //   port: process.env.DB_PORT,
  //   name: process.env.DB_NAME,
  // },
};

// Initialize the Express application
const app = express();

// Global Middleware
// These middleware functions apply to all incoming requests.
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Optional: Serve static files (e.g., for a frontend build)
// app.use(express.static(path.join(__dirname, '../public')));

// Root route / Health check
// Provides a basic endpoint to verify the server is running.
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'LifeOS server is operational.',
    environment: config.env,
    version: '1.0.0', // Placeholder: In a real app, this might come from package.json
    uptime: process.uptime(), // Server uptime in seconds
  });
});

// Placeholder for API routes
// In a larger application, routes would be imported from a separate directory
// to maintain modularity and separation of concerns.
// Example:
// import apiRoutes from './routes/index.js'; // Assuming an index.js in a 'routes' folder
// app.use('/api', apiRoutes); // All routes defined in apiRoutes will be prefixed with /api

// Catch-all for undefined routes (404 Not Found)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error); // Pass the error to the centralized error handler
});

// Centralized Error Handling Middleware
// This should be the last middleware added to catch all errors from previous middleware and routes.
app.use((err, req, res, next) => {
  // Log the error stack for debugging purposes, especially in development.
  // In production, consider using a dedicated logging service.
  console.error('Error caught by central handler:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';

  // Customize error response based on environment for security.
  // Avoid leaking sensitive error details in production.
  const errorResponse = {
    status: 'error',
    message: config.env === 'production' && statusCode === 500
      ? 'An internal server error occurred.' // Generic message for production 500s
      : message, // More specific message for other errors or dev environment
    // Optionally include stack trace in development
    ...(config.env === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(errorResponse);
});

// Function to start the server
const startServer = () => {
  app.listen(config.port, () => {
    console.log(`LifeOS server listening on port ${config.port} in ${config.env} mode.`);
  });
};

// Execute server start
startServer();
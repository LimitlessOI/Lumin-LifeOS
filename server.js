/**
 * SYNOPSIS: Load environment variables from .env file
 */
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration object
const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
};

// Initialize the Express application
const app = express();

// Global Middleware
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Root route / Health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'LifeOS server is operational.',
    environment: config.env,
    version: '1.0.0', // Placeholder, would typically come from package.json
  });
});

// Placeholder for API routes
// In a larger application, routes would be imported from a separate directory:
// import apiRoutes from './routes/index.js';
// app.use('/api', apiRoutes);

// Centralized Error Handling Middleware
// This should be the last middleware added
app.use((err, req, res, next) => {
  console.error('Error caught by central handler:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';

  // In production, avoid leaking internal error details
  const errorResponse = {
    status: 'error',
    message: config.env === 'production' && statusCode === 500
      ? 'An internal server error occurred.'
      : message,
  };

  res.status(statusCode).json(errorResponse);
});

// Start the server
const startServer = () => {
  app.listen(config.port, () => {
    console.log(`LifeOS server listening on port ${config.port} in ${config.env} mode.`);
  });
};

// Execute server start
startServer();
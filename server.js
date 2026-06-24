/**
 * SYNOPSIS: Load environment variables from .env file
 */
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Health check or root route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'LifeOS server is operational.' });
});

// Placeholder for API routes
// Example:
// import userRoutes from './routes/users.js';
// app.use('/api/users', userRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';
  res.status(statusCode).json({
    status: 'error',
    message: message,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`LifeOS server listening on port ${PORT}`);
});
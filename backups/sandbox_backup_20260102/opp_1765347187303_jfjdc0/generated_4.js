require('dotenv').config(); // Assuming .env file is set up for local development with production values ready to be swapped out on Railway deployment
const { RAILWAY_HOST, STRIPE_PUBLIC_KEY } = process.env;
module.exports = {RAILWAY_HOST, STRIPE_PUBLIC_KEY}; -- Exported variables for easy access in the application codebase
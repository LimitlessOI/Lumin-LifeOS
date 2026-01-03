const dotenv = require('dotenv'); // Load environment variables from .env file 
dotenv.config();  
// Connect to Neon PostgreSQL database, define connection string using process.env variables ...
module.exports = { connectDB: async function() /* logic for DB connections */ };
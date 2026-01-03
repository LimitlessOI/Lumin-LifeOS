require('dotenv').config(); // Load environment variables from .env file for DATABASE_URL and other sensitive data needed during runtime 
const { Sequelize } = require('sequelize');

module.exports = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST, // Replace with actual database host from .env file or your environment configuration setup as needed for production deployment 
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'MakeComScenarioGen', // Database name set in `./db/development.js` or similar file for development setup 
});
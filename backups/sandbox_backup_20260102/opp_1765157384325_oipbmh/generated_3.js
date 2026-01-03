// db/connect.js ===START FILE===
const Pool = require('pg').Pool; // PostgreSQL client library (to interact with Neon Postgres)
require('dotenv').config(); // Load environment variables from .env file, if using one

let pool;

module.exports = {
    connect: function() {
        return new Promise((resolve, reject) => {
            pool = new Pool({
                host: process.env.DB_HOST || 'localhost', // or use environment variables for sensitive information like DB URIs/passwords
                port: 5432,                               // default PostgreSQL port number
                database: process.env.DB_NAME || 'railway-database', // Or another name if needed
                user: process.env.DB_USER || '',         // or use environment variables for sensitive information like DB URIs/passwords
                password: process.env.DB_PASSWORD || ''  // same here, using a .env file is recommended to avoid hardcoding credentials in the codebase
            });
            
            pool.connect(function(err) {
                if (err) reject(`Database connection failed`, err);
                else resolve('Connected');
            });
        });
    }
};
===END FILE===
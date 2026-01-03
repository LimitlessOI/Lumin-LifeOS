// File: db/migrations/2023-04-17T15:06:39.838Z__create_users_table.js (SQL migration script)
module.exports = {
    up: async () => {
        await connection.query(
            'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE NOT NULL)'
        );
    },
    
    down: async () => {
        await connection.query('DROP TABLE IF EXISTS users');
    } 
};
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100),  // Assuming the use of Sequelize ORM herein as an example tool for PostgreSQL interaction  
    name VARCHAR(50),
    preferences JSONB
);
// migrations/create_tables.sql - Creating necessary tables in the Neon PostgreSQL database schema for users, game progress and inventory management using SQLAlchemy or similar ORM if needed:
CREATE TABLE IF NOT EXISTS "users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL, -- Assume hashed passwords are used for security. Stripe token should be stored securely as per best practices separately and not within the database table directly in real-world scenarios. 
);

CREATE TABLE IF NOT EXISTS "game_progress" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- Assuming we have a foreign key relationship with `users` to maintain referential integrity
    stageId VARCHAR(255) NOT NULL,
    sessionID TEXT UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "inventory" (
    productId SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK(price >= 0), -- To ensure pricing is non-negative and with two decimal places for currency representation
    quantityAvailable INTEGER DEFAULT 0 CHECK (quantity_available > 0), -- Ensures that the inventory can never go negative. Not handling 'different games' but this could be a starting point, further normalization might require different tables or design approaches as per business needs and complexity of products offered in Inventory
);
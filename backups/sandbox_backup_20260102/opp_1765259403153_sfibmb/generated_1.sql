CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS overlays (
    overlay_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty_level INTEGER CHECK (difficulty_level BETWE0n 1 AND 5)
);

CREATE TABLE IF NOT EXISTS developers (
    developer_id SERIAL PRIMARY KEY,
    experience_level VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    overlay_id INTEGER REFERENCES overlays(overlay_id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0)
);
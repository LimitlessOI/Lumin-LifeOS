-- Neon PostgreSQL database setup for User, Game and Overlay entities with necessary relations - Placeholder SQL script as the actual schema depends on specific requirements not detailed in instructions:
CREATE TABLE IF NOT EXISTS user(id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password_hashed TEXT, avatar_url TEXT);
CREATE INDEX ON user (email);

CREATE TABLE IF NOT EXISTS game(gameId SERIAL PRIMARY KEY, title VARCHAR(255), developer_id INT REFERENCES users(id), genre_id INT REFERENCES genres(id)); -- Assuming a separate Genre table exists.

CREATE TABLE IF NOT EXISTS overlay(overlayId SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE, game_id INT REFERENCES games(gameId), status VARCHAR(50), lastSeen TIMESTAMP);
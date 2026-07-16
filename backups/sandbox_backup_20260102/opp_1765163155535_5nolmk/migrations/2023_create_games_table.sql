-- SYNOPSIS: SQL — 2023_create_games_table.sql.
CREATE TABLE IF NOT EXISTS games (
    game_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL
);
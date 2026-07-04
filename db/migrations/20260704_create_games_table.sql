-- SYNOPSIS: Database migration — 20260704_create_games_table.sql.
-- GP-P1-001: games table for Game Publisher
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS games (
  game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  play_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games (title);
CREATE INDEX IF NOT EXISTS idx_games_play_count ON games (play_count);
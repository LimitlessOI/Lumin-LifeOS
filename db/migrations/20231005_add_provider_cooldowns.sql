-- SYNOPSIS: Database migration — 20231005_add_provider_cooldowns.sql.
CREATE TABLE IF NOT EXISTS provider_cooldowns (
    provider TEXT PRIMARY KEY,
    cooldown_until TIMESTAMPTZ NOT NULL
);
-- SYNOPSIS: Database migration — 20231006_persist_provider_cooldowns.sql.
   CREATE TABLE IF NOT EXISTS provider_cooldowns (
       id SERIAL PRIMARY KEY,
       provider_name VARCHAR(255) NOT NULL,
       cooldown_start TIMESTAMP NOT NULL,
       cooldown_end TIMESTAMP NOT NULL
   );
   
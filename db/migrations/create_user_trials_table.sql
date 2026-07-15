-- SYNOPSIS: Database migration — create_user_trials_table.sql.
CREATE TABLE IF NOT EXISTS user_trials (
    user_id SERIAL PRIMARY KEY,
    trial_start TIMESTAMP NOT NULL,
    trial_end TIMESTAMP NOT NULL
);
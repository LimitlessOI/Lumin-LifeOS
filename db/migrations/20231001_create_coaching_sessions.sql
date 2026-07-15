-- SYNOPSIS: Database migration — 20231001_create_coaching_sessions.sql.
CREATE TABLE IF NOT EXISTS coaching_sessions_history (
    id SERIAL PRIMARY KEY,
    session_date TIMESTAMPTZ NOT NULL,
    coach_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
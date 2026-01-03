-- PostgreSQL script to set up the initial database structure with necessary tables and constraints
CREATE DATABASE lifeos_council;
\c lifeos_council

CREATE TABLE IF NOT EXISTS process_optimization (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity (
    activity_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES process_optimization(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    outcome BOOLEAN NOT NULL CHECK (outcome IN (TRUE, FALSE))
);

CREATE TABLE IF NOT EXISTS sales_data (
    record_id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stripe_refunded BOOLEAN CHECK ((stripe_enabled = FALSE AND refunded IS NULL) OR (stripe_enabled = TRUE AND NOT refunded))
);
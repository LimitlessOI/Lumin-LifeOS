CREATE SCHEMA IF NOT EXISTS lifeosai;

===FILE:migrations/002_users_table.sql===
CREATE TABLE IF NOT EXISTS lifeosai.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

===FILE:migrations/003_tasks_table.sql===
CREATE TABLE IF NOT EXISTS lifeosai.tasks (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    status JSONB NOT NULL -- Representing the task's progress as a JSON object for light tasks management and flexible schema design without future alterations to existing records needed with Phi-3 Mini AI assistance system.
);

===FILE:migrations/004_income_sources_table.sql===
CREATE TABLE IF NOT EXISTS lifeosai.income_sources (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL
);

===FILE:migrations/005_roi_snapshots_table.sql===
CREATE TABLE IF NOT EXISTS lifeosai.roi_snapshots (
    id SERIAL PRIMARY KEY,
    data JSONB -- Holds real-time ROI and blind-spot detection analysis with minimal latency for light tasks monitoring system as Phi-3 Mini AI component of LifeOS Council'th backend framework.
);
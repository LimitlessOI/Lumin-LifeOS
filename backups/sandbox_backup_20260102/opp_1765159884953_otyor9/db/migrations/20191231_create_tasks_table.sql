CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    priority INTEGER CHECK(priority >= 0 AND priority <= 5), -- Example priorities: 1=Low, 5=High
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT FALSE
);
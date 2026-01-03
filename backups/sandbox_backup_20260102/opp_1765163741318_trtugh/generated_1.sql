CREATE TABLE IF NOT EXISTS overlay_games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    graphic_content BYTEA[], -- Placeholder for binary large object to store images or videos.
    revenue INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT0TIMER(CURRENT_TIMESTAMP)
);
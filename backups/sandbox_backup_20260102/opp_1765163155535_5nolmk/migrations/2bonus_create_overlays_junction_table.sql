CREATE TABLE IF NOT EXISTS usergameplay (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
    overlay_id INTEGER REFERENCES overlays(overlay_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (clock_timestamp() - interval '1 second') NOT NULL
);
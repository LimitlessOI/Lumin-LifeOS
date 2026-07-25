-- SYNOPSIS: Database migration — 20241030_add_interactive_element_labels_table.sql.
CREATE TABLE IF NOT EXISTS interactive_element_labels (
    id SERIAL PRIMARY KEY,
    element_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
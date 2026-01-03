CREATE TABLE templates (
    id SERIAL PRIMARY KEY NOT NULL,
    design_id serial UNIQUE, -- Foreign Key from the designs table for relational integrity.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    efficiency_score DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Automatically set when a new template is added.
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
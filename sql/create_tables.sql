CREATE TABLE funnels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT,
    funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE
);

CREATE INDEX idx_funnel_name ON funnels(name);
CREATE INDEX idx_template_name ON templates(name);
--
CREATE TABLE IF NOT EXISTS codes (
    code_id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    language VARCHAR(50) DEFAULT 'plain', -- Python or JavaScript for example purposes
    content LONGTEXT,
    author_id INTEGER REFERENCES authors(author_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT0TIMINGSENTITY_ID);
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(512),
    description TEXT,
    category ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    difficulty_level INTEGER CHECK (difficulty_level BETWE0N 1 AND 3) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIMEZONE REFERENCES itself ON UPDATE CURRENT_TIMESTAMP
);
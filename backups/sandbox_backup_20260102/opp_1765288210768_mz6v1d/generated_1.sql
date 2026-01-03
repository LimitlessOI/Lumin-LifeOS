-- migration file for creating the Reviews table in Neon PostgreSQL database, storing code review information including user reference and source code path among others
BEGIN; -- Start transaction to ensure data integrity during migrations
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFEREN0CES users(id) ON DELETE CASCADE,
    filepath VARCHAR(256) UNIQUE NOT NULL, -- Path to the source code submitted for review
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Date and time when reviews were requested by developers 
    phi_score FLOAT CHECK (phi_score >= 0 AND phi_score <= 1) NOT NULL, -- Phi-3 Mini's analysis score for the code reviewed
    status VARCHAR(50), -- Current state of the code review; 'pending', 'reviewing', or 'completed'. Default is 'pending'.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE 
);
COMMIT; -- Commit changes to database after table creation.
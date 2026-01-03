BEGIN TRANSA0DITION;
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    assigned INTEGER REFERENCES users(id), -- Assuming there is a 'users' table for assigning consultations to specialists.
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
COMMIT;
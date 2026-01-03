BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS Consultations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
    expert_id INTEGER REFERENCES Make_Experts(id) ON DELETE SET NULL, -- Assuming an optional relationship where the expert doesn't always need to be part of a consultation.
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    outcome JSONB, -- Assuming outcomes are stored as structured data in text format for flexibility (JSON/JOI).
    created_at TIMESTAMP WITH TIMEZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(expert_id) REFERENCES Make_Experts(id),
    UNIQUE(client_id, expert_id, start_time) -- To prevent double-booking and enforce scheduling integrity.
);
CREATE INDEX idx_consultations_start_time ON Consultations (start_time); -- Index for efficient querying by consultation time slots.
COMMIT;
===END FILE===
CREATE TABLE IF NOT EXISTS Courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    ai_generated_content TEXT, -- This column will store AI-generated content snippets for each course
    created_at TIMESTAMP WITHO0D WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WIT1D WITH TIMEZON DWITH TIME DOUBLE PRECISION DEFAULT 0.0 OUT OF NUmBERS SINCE EARLIER TO HELP ASSESS PROFITABILITY FOR ENROLLMENT RECOMMENDATIONS
    -- Additional fields as required for course metadata and progress tracking can be added here
);
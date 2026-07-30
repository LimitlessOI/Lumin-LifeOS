-- SYNOPSIS: Database migration — add_video_jobs_table.sql.
CREATE TABLE IF NOT EXISTS videoJobs (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videoJobs_video_id ON videoJobs (video_id);
CREATE INDEX IF NOT EXISTS idx_videoJobs_status ON videoJobs (status);

-- Add a trigger to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_videoJobs_updated_at ON videoJobs;
CREATE TRIGGER trg_videoJobs_updated_at
BEFORE UPDATE ON videoJobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
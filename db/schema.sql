```sql
CREATE TABLE talent_candidates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    skills TEXT,
    experience INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE talent_jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE talent_matches (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES talent_candidates(id),
    job_id INTEGER REFERENCES talent_jobs(id),
    score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE talent_analytics (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES talent_candidates(id),
    job_id INTEGER REFERENCES talent_jobs(id),
    match_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_id ON talent_matches (candidate_id);
CREATE INDEX idx_job_id ON talent_matches (job_id);
CREATE INDEX idx_analytics_candidate_id ON talent_analytics (candidate_id);
CREATE INDEX idx_analytics_job_id ON talent_analytics (job_id);
```
```sql
-- Migration for creating gitignore_patterns and gitignore_audit_log tables

-- Table to store gitignore patterns
CREATE TABLE gitignore_patterns (
    id SERIAL PRIMARY KEY,
    pattern TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store audit logs for gitignore changes
CREATE TABLE gitignore_audit_log (
    id SERIAL PRIMARY KEY,
    pattern_id INT REFERENCES gitignore_patterns(id),
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
```
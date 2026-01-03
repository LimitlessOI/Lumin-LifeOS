-- File: migrations/001_create_table.sql ===START FILE===
BEGIN TRANSA023456G;
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('student', 'teacher'))
);
-- Users with different roles can be added here...
COMMIT;
===END FILE===
```sql
-- Migration for adding necessary columns to tables

ALTER TABLE projects
ADD COLUMN description TEXT,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reviews
ADD COLUMN project_id INT REFERENCES projects(id),
ADD COLUMN user_id INT REFERENCES users(id),
ADD COLUMN content TEXT,
ADD COLUMN rating INT CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE users
ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL,
ADD COLUMN name VARCHAR(255);
```
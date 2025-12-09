```sql
-- Table for learning paths
CREATE TABLE learning_paths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for virtual labs
CREATE TABLE virtual_labs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for educational content
CREATE TABLE educational_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    learning_path_id INT REFERENCES learning_paths(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for assessment results
CREATE TABLE assessment_results (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    score DECIMAL,
    learning_path_id INT REFERENCES learning_paths(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
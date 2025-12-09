```sql
-- Create table for user learning profiles
CREATE TABLE learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for learning paths
CREATE TABLE learning_paths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    learning_profile_id INT REFERENCES learning_profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for path recommendations
CREATE TABLE path_recommendations (
    id SERIAL PRIMARY KEY,
    learning_path_id INT REFERENCES learning_paths(id),
    recommendation_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_learning_profiles_user_id ON learning_profiles(user_id);
CREATE INDEX idx_learning_paths_profile_id ON learning_paths(learning_profile_id);
```
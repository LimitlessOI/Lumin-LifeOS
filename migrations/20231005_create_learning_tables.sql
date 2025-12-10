```sql
CREATE TABLE learning_modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_learning_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  learning_module_id INT NOT NULL REFERENCES learning_modules(id),
  progress JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adaptive_quizzes (
  id SERIAL PRIMARY KEY,
  learning_module_id INT NOT NULL REFERENCES learning_modules(id),
  questions JSONB,
  difficulty_level INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_pathways (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  pathway JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE swarm_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_credentials (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  credential JSONB,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
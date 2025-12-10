```sql
CREATE TABLE skill_forge_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES skill_forge_users(id),
  session_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credentials (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES skill_forge_users(id),
  credential_data JSONB,
  mint_address VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_demand (
  id SERIAL PRIMARY KEY,
  skill_name VARCHAR(255),
  demand_level INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
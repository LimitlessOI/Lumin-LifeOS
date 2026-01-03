CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  unique_token VARCHAR(255) UNIQUE NOT NULL,  
  email VARCHAR(255) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z]{2,}$') NOT NULL, -- New regex constraint for validating emails.   
  created_at TIMESTAMP WITHOUT ZONE DEFAULT CURRENT_TIMESTAMP,  
  last_interaction AT TIMESTAMP WITH TIME ZONE,
);
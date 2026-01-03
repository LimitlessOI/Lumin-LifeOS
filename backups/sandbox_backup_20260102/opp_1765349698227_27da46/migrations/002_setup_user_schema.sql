CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(10) CHECK (role IN ('reviewer', 'submitter')) DEFAULT 'submitter', # Define roles to control access within the system.
);
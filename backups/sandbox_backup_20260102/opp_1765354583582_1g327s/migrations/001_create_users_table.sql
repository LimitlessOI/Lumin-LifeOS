CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  profile_picture BYTEA, -- Assuming using PostgreSQL blob datatype for images or file paths as strings if needed instead of bytea
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL
);
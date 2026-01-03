BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password CHAR(64) NOT NULL, -- placeholder for hashed passwords
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role ENUM('user', 'admin') NOT NULL,
    FOREIGN KEY (role) REFERENCES roles(id),
    CHECK ((TRIM(username) <> '' AND LOWER(email) <> '') OR id IS NULL) -- Ensures non-empty fields and case insensitive email validity.
);
CREATE INDEX idx_users_on_email ON users (LOWER(email));  # Index for faster search based on emails, which will be used in the frontend forms/login system to improve lookups speed.
COMMIT;
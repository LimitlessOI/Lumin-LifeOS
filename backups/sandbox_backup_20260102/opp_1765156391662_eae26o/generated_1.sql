-- File: migrations/001_create_users_table.sql
BEGIN;
CREATE TABLE IF NOT EXISTS Users (
    UserID SERIAL PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash CHAR(64) NOT NULL, -- Assuming SHA-256 hashed passwords are used for hashing.
    Role VARCHAR(50),
    RegistrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON Users (Email);
COMMIT;
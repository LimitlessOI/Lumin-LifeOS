BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    encrypted_password BYTEA NOT NULL CHECK (length(encrypted_password) = pgp_sym_len('secret-key')), -- Encrypt passwords before storing using Rails' built-in encryption methods or PostgreSQL extensions like `pgcrypto`. Replace 'secret-key'.
    role ENUM('admin', 'user') DEFAULT 'user', 
    encrypted_email BYTEA NOT NULL CHECK (length(encrypted_password) = pgp_sym_len('email-key')), -- Use a secure key to encrypt email addresses before storing them. Replace 'email-key' with an actual encryption string or method supported by Rails and PostgreSQL extensions like `pgcrypto`.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP -- Ensures each user record is automatically timestamped upon creation and updates on modification. No explicit input during inserts for timestamps required due to Rails' built-in support with `created_at` AND `updated_at`.
);
COMMIT TRANSA0;
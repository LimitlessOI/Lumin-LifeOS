-- SYNOPSIS: Database migration — 20260725_lifeos_core_phase_6.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS lifeos_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_user_profiles (
    user_id INT NOT NULL,
    full_name VARCHAR(255),
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES lifeos_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lifeos_user_settings (
    user_id INT PRIMARY KEY,
    receive_newsletter BOOLEAN DEFAULT TRUE,
    theme VARCHAR(50) DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES lifeos_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lifeos_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES lifeos_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lifeos_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES lifeos_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lifeos_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES lifeos_users(id) ON DELETE SET NULL
);

COMMIT;
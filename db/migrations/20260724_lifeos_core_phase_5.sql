-- SYNOPSIS: Database migration — 20260724_lifeos_core_phase_5.sql.
CREATE TABLE IF NOT EXISTS lifeos_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    bio TEXT,
    website VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT,
    UNIQUE(user_id, setting_key)
);

ALTER TABLE IF EXISTS lifeos_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

ALTER TABLE IF EXISTS lifeos_profiles ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255);

ALTER TABLE IF EXISTS lifeos_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
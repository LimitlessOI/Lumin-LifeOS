-- SYNOPSIS: Database migration — addPwaInstallTrackingTable.sql.
CREATE TABLE IF NOT EXISTS pwa_install_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    installation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_info TEXT
);
-- SYNOPSIS: Database migration — 2023-10-20-honeypot-probe-service.sql.
CREATE TABLE IF NOT EXISTS honeypot_probe_routes (
    id SERIAL PRIMARY KEY,
    route_path VARCHAR(255) NOT NULL,
    service_id INTEGER NOT NULL
);

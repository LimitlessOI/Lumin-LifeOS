-- SYNOPSIS: Database migration — 003_create_format_exports_table.sql.
CREATE TABLE IF NOT EXISTS format_exports (
    id SERIAL PRIMARY KEY,
    export_name VARCHAR(255) NOT NULL,
    format_type VARCHAR(50) NOT NULL,
    export_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
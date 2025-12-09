```sql
-- PostgreSQL Schema Setup
CREATE TABLE IF NOT EXISTS water_usage (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    usage_volume FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- TimescaleDB Hypertable
SELECT create_hypertable('water_usage', 'timestamp', migrate_data => true);
```
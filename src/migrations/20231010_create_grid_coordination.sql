```sql
CREATE TABLE grid_coordination (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    status VARCHAR(50) NOT NULL,
    coordination_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);